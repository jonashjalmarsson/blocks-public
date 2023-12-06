/*
	A Snap Value functionality to snap values to a set of fixed values with a snapSize.
	Sample:
		"persistent": false, // if persistent is enabled, the values will be saved to a file and loaded on startup.
		"value1": {
			'initValue': 25, // the initial value of the variable
			'snapSize': 10, // the snapsize of the variable
			'snapValues': [ // the values to snap to
				500, 1670, 1850
			],
			"precision": 0, // the precision of the variable
		}

	The script publishes each value as a property with the name of the value and one with the name of the value + "Snap"
	which contains the snapped value. The script also publishes a reload function to reload the values from the json file.

	If persistent is enabled, the values will be saved to a file and loaded on startup.

	The script is based on PixiLab's Persistant.ts script.

	Script made by Jonas Hjalmarsson, By Jalma AB, Sweden (https://byjalma.se).
	Idea and ordered by Petter Feltenstedt, Kalmar Mediespecialist AB, Sweden (http://mediespecialist.se).
	All Rights Reserved.

	VERSION 1.0
*/
import { callable } from "system_lib/Metadata";
import { Script, ScriptEnv } from "system_lib/Script";
import { SimpleFile } from "system/SimpleFile";
import { PrimTypeSpecifier } from "system/PubSub";

export class SnapValue extends Script {
	private data: any;
	private values: any;
	private mPersistor: CancelablePromise<any>;	// Timer when persistent write pending
	private mPersistent: false;
	private static kFileName = "SnapValue.json";	// Name of file where I persist my data
	private static kPersistentFileName = "SnapValuePersistent.json";	// Name of file where I persist my data

	public constructor(env: ScriptEnv) {
		super(env);
		this.readJsonFiles();
	}

	@callable("Reload settings from JSON file")
	public reload() {
		this.readJsonFiles()
	}

	/**
	 * Read the JSON readJsonFiles
	 */
	private readJsonFiles() {
		SimpleFile.read(SnapValue.kFileName).then(data => {
			try {
				this.data = JSON.parse(data)
				this.mPersistent = this.data['persistent'] ?? false
			} catch (parseError) {
				console.error("Failed parsing JSON data from init file", SnapValue.kFileName, parseError);
			}
		}).catch(	// Failed reading file.
			error => {
				console.error("Failed reading init file; use initial sample data", SnapValue.kFileName, error);
				//  Likely had no file. Init with some sample data
				this.data = {
					"persistent": false,
					"value1": {
						'initValue': 25,
						'snapSize': 10,
						'snapValues': [
							500, 1670, 1850
						],
						"precision": 0,
					}
				}
				this.mPersistent = false
			}
		).finally(() => {
			this.publishProperties() // Publish the actual properties

			if (this.mPersistent) { // read last values if persistent variables enabled
				SimpleFile.read(SnapValue.kPersistentFileName).then(data => {
					try {
						this.values = JSON.parse(data)
					} catch (parseError) {
						console.error("Failed parsing JSON data from persistent file", SnapValue.kPersistentFileName, parseError);
						this.initValues() // init values if no persistant file is found
					}
				}).catch(
					error => {
						console.error("Failed reading persistent file; use initial values", SnapValue.kPersistentFileName, error);
						this.initValues() // init values if no persistant file is found
					}
				)
			}
			else { // if no persistant values, init values from initValue in json file
				this.initValues()
			}

		});

	}

	/**
	 * Init default values from initValues
	 */
	private initValues() {
		this.values = new Array()
		for (const key in this.data) {
			if (key == "persistent") continue
			this.values[key] = this.data[key]["initValue"]
		}
		this.persistVars();

	}
	/**
	 * Data was just loaded. Publish all primitive items as named properties.
	 */
	private publishProperties() {
		for (const key in this.data) {
			const propData = this.data[key];
			// Obtain formal type from value type
			const typeName: string = typeof propData;
			if (key == "persistent") continue;
			if (typeName === 'object') {
				this.makeProperties(key);
			}
			else
				console.error("Invalid type of ", key, typeName)
		}
	}


	/**
	 * Make and publish a property with name of typeName.
	 */
	private makeProperties(name: string) {
		try {
			this.property<string>(name, { type: <PrimTypeSpecifier>Number }, value => {
				if (value !== undefined && value !== this.data[name]) {
					// Specific and changed value - set it
					let precision = this.data[name]['precision'] ?? 0
					this.values[name] = Number(value).toFixed(precision);
					this.changed(name + 'Snap')
					this.persistVars();
				}
				return this.values[name];	// Always return current value
			});
			this.property<string>(name + "Snap", { type: <PrimTypeSpecifier>Number, readOnly: true }, () => {
				let currValue = this.values[name]
				let size = this.data[name]['snapSize']
				let values = this.data[name]['snapValues']
				let precision = this.data[name]['precision'] ?? 0
				for (let i = 0; i < values.length; i++) {
					let val = Number(values[i])
					if (val - size < currValue && val + size > currValue)
						return val.toFixed(precision)

				}
				return Number(this.values[name]).toFixed(precision);	// Return snap-value
			});
		}
		catch (error) {
			console.warn("Already initialized property " + name)
		}
	}


	/**
	 * Make sure my persistent data is saved soon.
	 */
	private persistVars() {
		if (!this.mPersistent) return

		if (!this.mPersistor) {
			this.mPersistor = wait(200);
			this.mPersistor.then(() => {
				delete this.mPersistor;
				const jsonData = JSON.stringify(this.values, null, 2);
				SimpleFile.write(SnapValue.kPersistentFileName, jsonData);
			});
		}
	}
}
