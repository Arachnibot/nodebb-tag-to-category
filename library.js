'use strict';

const _ = require.main.require("lodash");
const nconf = require.main.require('nconf');
const winston = require.main.require('winston');

const meta = require.main.require('./src/meta');

const controllers = require('./lib/controllers');

const routeHelpers = require.main.require('./src/routes/helpers');

const plugin = {};

plugin.init = async (params) => {
	const router = params.router;
    const hostMiddleware = params.middleware;
    const controllers = params.controllers;


	// debug reset line
	await meta.settings.set("tag-to-category-0.0", {});

    const settings = await meta.settings.get("tag-to-category-0.0");


	
	if (settings === undefined || _.isEmpty(settings)) {
		winston.info("tag-to-category: settings missing. Initializing...");

		plugin.settings = {
            tags: [{name: "_example", routesTo: -1}],
			users: [{name: "example@example.org", routesTo: -1}]
        };

		// debug lines to see if I can alter settings through code
		// (will do via gui later)
		plugin.settings.tags.push({name: "test", routesTo: 8});
		plugin.settings.tags.push({name: "anime", routesTo: 8});
		plugin.settings.tags.push({name: "rpgmemes", routesTo: 8});

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



plugin.moveTopicByTag = async (input) => {
	// might be able to declare this in function signature?
	// hardly use javascript, so I'm not sure...
	let result = {topic: {}, data: {}};
	result.topic = input.topic;
	result.data = input.data;

	//we use toLowerCase() to prevent capitalization mismatches?
	// might make that a setting later?
	const settings = await meta.settings.get("tag-to-category-0.0");

	settings.tags.forEach((tag) => {

		winston.info("tag-to-category: checking tag" + tag.name);
        winston.info(JSON.stringify(tag));

		if (result.topic.tags.toLowerCase().includes(tag.name.toLowerCase())) {
			// activitypub.helpers.isUri(uid) will be useful later perhaps?
			winston.info("tag-to-category: routing to cid" + tag.routesTo);
			result.topic.cid = tag.routesTo;
		}
	})
	
	return result;
}

module.exports = plugin;
