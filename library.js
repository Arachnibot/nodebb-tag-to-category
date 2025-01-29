'use strict';

const _ = require.main.require("lodash");
const nconf = require.main.require('nconf');
const winston = require.main.require('winston');

const meta = require.main.require('./src/meta');

const controllers = require('./lib/controllers');
const user = require.main.require('./src/user');
const activitypub = require.main.require('./src/activitypub');

const routeHelpers = require.main.require('./src/routes/helpers');

const plugin = {};

plugin.init = async (params) => {
	const router = params.router;
    const hostMiddleware = params.middleware;
    const controllers = params.controllers;

	// debug reset line
	plugin.settings = {}
	await meta.settings.set("tag-to-category-0.0", plugin.settings);

    const settings = await meta.settings.get("tag-to-category-0.0");
	
	// (settings === undefined || _.isEmpty(settings))
	if (true) {
		winston.info("tag-to-category: settings missing. Initializing...");

		plugin.settings = {
            filters: [{name: "_example_name_or_tag", routesTo: -1}],
        };

		// debug lines to see if I can alter settings through code
		// (will do via gui later)
		plugin.settings.filters.push({name: "test", routesTo: 8});
		plugin.settings.filters.push({name: "https://ani.social/c/manga", routesTo: 8});
		plugin.settings.filters.push({name: "https://ttrpg.network/c/pbta", routesTo: 8});
		plugin.settings.filters.push({name: "https://community.nodebb.org/category/4", routesTo: 8});
		plugin.settings.filters.push({name: "https://nodebb.arachnibot.com/uid/1", routesTo: 8});

		await meta.settings.set("tag-to-category-0.0", plugin.settings);
		winston.info("tag-to-category: pushed extra tags");
    } else {
        winston.info("tag-to-category: settings properly present for tag-to-category!");
        winston.info(JSON.stringify(settings));
    }

};

/**
 * If you wish to add routes to NodeBB's RESTful API, listen to the `static:api.routes` hook.
 * Define your routes similarly to above, and allow core to handle the response via the
 * built-in helpers.formatApiResponse() method.
 *
 * In this example route, the `ensureLoggedIn` middleware is added, which means a valid login
 * session or bearer token (which you can create via ACP > Settings > API Access) needs to be
 * passed in.
 *
 * To call this example route:
 *   curl -X GET \
 * 		http://example.org/api/v3/plugins/quickstart/test \
 * 		-H "Authorization: Bearer some_valid_bearer_token"
 *
 * Will yield the following response JSON:
 * 	{
 *		"status": {
 *			"code": "ok",
 *			"message": "OK"
 *		},
 *		"response": {
 *			"foobar": "test"
 *		}
 *	}
 */
plugin.addRoutes = async ({ router, middleware, helpers }) => {
	const middlewares = [
		middleware.ensureLoggedIn,			// use this if you want only registered users to call this route
		middleware.admin.checkPrivileges,	// use this to restrict the route to administrators
	];

	routeHelpers.setupApiRoute(router, 'get', '/quickstart/:param1', middlewares, (req, res) => {
		helpers.formatApiResponse(200, res, {
			foobar: req.params.param1,
		});
	});
};


plugin.addAdminNavigation = (header) => {
	header.plugins.push({
		route: '/plugins/tag-to-category',
		icon: 'fa-tint',
		name: 'Tag to Category',
	});

	return header;
};

async function renderAdminPage(req, res) {
    let pluginCategories = {};
    for (const [cid, value] of Object.entries(plugin.settings.categories)) {
        pluginCategories[cid] = {
            ...value,
            name: await categories.getCategoryField(cid, "name")
        }
    }
    
    return res.render("admin/plugins/category-tags", {categoryTags: plugin.settings.tags, categories: pluginCategories});
}


plugin.sortTopic = async (input) => {
	// might be able to declare this in function signature?
	// hardly use javascript, so I'm not sure...
	let result = {topic: {}, data: {}};
	result.topic = input.topic;
	result.data = input.data;

	// might make that a setting later?
	const settings = await meta.settings.get("tag-to-category-0.0");
	winston.info("tag-to-category: auto-sorting topic");
	winston.info(JSON.stringify(settings));
	winston.info(JSON.stringify(result));

	// loop over all filters (higher indexs = higher priority)
	settings.filters.forEach((item) => {
		winston.info("tag-to-category: checking " + item.name);

		// tags
		// no need to compare if post doesn't have tags
		const hasTags = result.data.tags != undefined || result.data.tags != [];
		if (hasTags && result.data.tags.includes(item.name)) {
			winston.info("tag-to-category: tag match, routing to cid " + item.routesTo);
			result.topic.cid = item.routesTo;
		}

		// users
		// TODO: convert to uids when saving settings?
		// number uid match
		var parsedUid = parseInt(item.name);
		if (isNaN(parsedUid) && user.exists(parsedUid) && result.topic.uid == parsedUid) {
			winston.info("tag-to-category: uid match, routing to cid " + item.routesTo);
			result.topic.cid = item.routesTo;
		}
		// userslug match (make sure to add host!)
		else if (user.existsBySlug(item.name) && result.topic.uid == user.getUidByUserslug(item.name)) {
			winston.info("tag-to-category: userslug match, routing to cid " + item.routesTo);
			result.topic.cid = item.routesTo;
		}

		// activitypub targets
		const ap = result.data._activitypub
		if (ap) {
			const itemUri = activitypub.helpers.query(item.name);
			winston.info("tag-to-category: activitypub uri for item is " + itemUri);

			const inTo = ap.cc.includes(itemUri);
			const inCc = ap.to.includes(itemUri);
			if (inTo || inCc) {
				winston.info("tag-to-category: addressed actor, routing to cid " + item.routesTo);
				result.topic.cid = item.routesTo;
			}
		}
	})

	return result;
}

module.exports = plugin;