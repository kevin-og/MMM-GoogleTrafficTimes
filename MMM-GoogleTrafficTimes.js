var self;
Module.register("MMM-GoogleTrafficTimes", {
	defaults: {
		key: "",
		mode: "driving",
		origin: "SW1A 1AA",
		destinations: [
			{
				name: "Work",
				address: "SW1A 2PW"
			},
			{
				name: "Gym",
				address: "XXX"
			}
		],
		updateInterval: 900000,
		avoidHighways: false,
		avoidTolls: false,
		unitSystem: "metric",
		showSymbol: true,
		showSymbolDetails: false,
		trafficModel: "best_guess",
		language: "en-EN",
		offsetTime: 25,
		debug: false
	},

	getStyles () {
		return ["MMM-GoogleTrafficTimes.css", "font-awesome.css"];
	},

	getScripts () {
		return [this.file("./Costants.js")];
	},

	start () {

		self = this;
		Log.info(`Starting module: ${this.name}`);
		// make sure mode is lower case
		this.config.mode = this.config.mode.toLowerCase();
		if (this.config.key === "") {
			Log.error(`Module ${this.name}: API key not provided or valid!`);
			return;
		}
		if (this.config.destinations === "" || this.config.destinations.length == 0) {
			Log.error(`Module ${this.name}: destinations not provided or valid!`);
			return;
		}
		this.times = {};

		this.sendSocketNotification("GET_GOOGLE_TRAFFIC_TIMES", this.config);
		if (self.config.debug) Log.info(`Module ${this.name}: notification request send.`);
		setInterval(function () {
			self.sendSocketNotification("GET_GOOGLE_TRAFFIC_TIMES", self.config);
			if (self.config.debug) Log.info(`Module ${this.name}: notification request send.`);
		}, this.config.updateInterval);
	},

	async socketNotificationReceived (notification, payload) {
		if (notification === "GET_GOOGLE_TRAFFIC_TIMES_RESPONSE") {
			if (self.config.debug) Log.info(`Module ${self.name}: notification response received.`);
			if (self.config.debug) Log.info(`Module ${self.name}: response -> ${JSON.stringify(payload)}.`);
			this.times = payload;
			this.updateDom();
		}
	},

	getContent (wrapper, destination, response) {
		if (self.config.debug) Log.info(`Module ${self.name}: inside getContent.`);
		if (response.status != "OK") {
			Log.error(`Module ${self.name}: destination ${destination}, status = ${response.status}`);
			return; }

		var time = response.duration;
		var traffic_time = response.duration_in_traffic;
		var container = document.createElement("div");

		var firstLineDiv = document.createElement("div");
		firstLineDiv.className = "bright medium mmmtraffic-firstline";
		var secondLineDiv = document.createElement("div");
		secondLineDiv.className = "normal small mmmtraffic-secondline";

		var symbolString = this.getSymbol(self.config.mode);

		if (self.config.showSymbol) {
			var symbol = document.createElement("span");
			symbol.className = `fa fa-${symbolString} symbol`;
			firstLineDiv.appendChild(symbol);
		}

		// symbol details only with driving mode, others do not have this info
		if (self.config.mode == TravelModes.DRIVING && self.config.showSymbolDetails) {
			var symbolDetails = document.createElement("span");
			// let's give traffic a little gap (1 minute difference is no traffic)
			var timeWithoutTrafficWithGap = time.value + (time.value * (self.offsetTime / 100));
			symbolDetails.className = "fa fa-users symbol";
			if (traffic_time.value > timeWithoutTrafficWithGap) firstLineDiv.appendChild(symbolDetails);
		}

		var firstLineText = document.createElement("span");
		if (self.config.mode == TravelModes.DRIVING) firstLineText.innerHTML = traffic_time.text;
		else firstLineText.innerHTML = time.text;
		firstLineDiv.appendChild(firstLineText);
		container.appendChild(firstLineDiv);

		secondLineDiv.innerHTML = destination;
		container.appendChild(secondLineDiv);
		wrapper.innerHTML += container.innerHTML;
	},

	getDestinationName (destination) {
		return destination.name;
	},

	getDestinationNames () {
		var names = [];
		self.config.destinations.forEach((destination) => {
			names.push(this.getDestinationName(destination));
		});

		return names;
	},

	getSymbol () {
		var symbolString = TravelSymbols.CAR;
		if (self.mode == TravelModes.CYCLING) symbolString = TravelSymbols.BICYCLE;
		if (self.mode == TravelModes.WALKING) symbolString = TravelSymbols.WALKING;
		return symbolString;
	},

	// Override dom generator.
	getDom () {
		if (self.config.debug) Log.info(`Module ${self.name}: inside getDom.`);

		var wrapper = document.createElement("div");
		var response = self.times;
		if (response !== undefined && response["rows"] !== undefined && response["rows"].length > 0) {
			var names = self.getDestinationNames(self.config);
			var results = response["rows"][0]["elements"];
			for (var j = 0; j < results.length; j++) {
				self.getContent(wrapper, names[j], results[j]);
			}
		}
		return wrapper;
	}
});
