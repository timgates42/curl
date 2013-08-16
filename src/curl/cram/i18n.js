/** MIT License (c) copyright 2010-2013 B Cavalier & J Hann */

/**
 * curl i18n! cram plugin
 */
define(['../plugin/i18n', '../plugin/locale'], function (i18n, getLocale) {

	var tos, stringifiers, beenThereFlag;

	tos = Object.prototype.toString;
	stringifiers = {
		Array: arrayAsString,
		Boolean: asString,
		Date: dateAsString,
		Function: asString,
		Null: nullAsString,
		Number: asString,
		Object: objectAsString,
		RegExp: asString,
		String: stringAsString,
		Undefined: undefinedAsString
	};
	beenThereFlag = '__cram_i18n_flag__';

	function bundleToString (thing) {
		return thingToString(thing);
	}

	bundleToString.compile = function (pluginId, resId, req, io, config) {
		var i18nId, localeId, locales, captured, count, toId;

		i18nId = pluginId + '!' + resId;
		localeId = 'locale!' + resId;
		locales = config.locales || [];
		locales.push(''); // default bundle
		captured = [];
		count = locales.length;
		toId = config['localeToModuleId'] || getLocale.toModuleId;

		// use the load method of the run-time plugin, capturing bundles.
		locales.forEach(function (locale, i) {

			loaded.error = stop;
			i18n.load(i18nId, req, loaded, config);

			function loaded (bundle) {
				// each bundle captured is converted to a locale!id variant
				captured[i] = {
					locale: locale,
					id: toId(localeId, locale),
					body: 'return ' + bundleToString(bundle)
				};
				if (--count == 0) done();
			}
		});

		if (!locales.length) done();

		function stop (ex) {
			count = 0;
			io.error(ex);
		}

		function done () {
			// add the default i18n bundle which uses the locale! plugin to
			// require() or fetch the correct bundle.
			captured.push({
				id: i18nId,
				body: 'return bundle;',
				modules: [localeId],
				args: ['bundle']
			});
			io.write(captured.reduce(reduceOneCapture, ''));
		}

		function reduceOneCapture (output, capture) {
			var body, id, modules, args;

			body = capture.body;
			id = capture.id;
			modules = capture.modules;
			args = capture.args;

			return output += amdDefine(id, modules, args, body);
		}

	};

	return bundleToString;

	function thingToString (thing) {
		var t, stringifier;

		t = type(thing);
		stringifier = stringifiers[t];

		if (!stringifier) throw new Error('Can\'t encode i18n item of type ' + t);

		return stringifier(thing);
	}

	function asString (thing) {
		return thing.toString();
	}

	function nullAsString () {
		return 'null';
	}

	function stringAsString (s) {
		return '"' + s + '"';
	}

	function undefinedAsString () {
		return 'undefined';
	}

	function dateAsString (date) {
		return 'new Date("' + date + '")';
	}

	function arrayAsString (arr) {
		var i, len, items, item;
		arr[beenThereFlag] = true;
		items = [];
		for (i = 0, len = arr.length; i < len; i++) {
			item = arr[i];
			if (typeof item == 'object' && beenThereFlag in item) {
				throw new Error('Recursive object graphs not supported in i18n bundles.');
			}
			items.push(thingToString(item));
		}
		delete arr[beenThereFlag];
		return '[' + items.join(',') + ']';
	}

	function objectAsString (obj) {
		var p, items, item;
		obj[beenThereFlag] = true;
		items = [];
		for (p in obj) {
			if (p != beenThereFlag) {
				item = obj[p];
				if (typeof item == 'object' && beenThereFlag in item) {
					throw new Error('Recursive object graphs not supported in i18n bundles.');
				}
				items.push('"' + p + '":' + thingToString(item));
			}
		}
		delete obj[beenThereFlag];
		return '{' + items.join(',') + '}';
	}

	function type (thing) {
		return tos.call(thing).slice(8, -1);
	}

	function amdDefine (id, deps, args, body) {
		return 'define("' + id + '", '
			+ (deps && deps.length ? arrayAsString(deps) + ', ' : '')
			+ 'function (' + (args && args.join(',')) + ') {\n'
			+ body
			+ ';\n});\n';
	}

});
