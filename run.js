/*jslint node: true */
"use strict";
const eventBus = require('ocore/event_bus.js');
const network = require('ocore/network.js');
const conf = require('ocore/conf.js');
const operator = require('aabot/operator.js'); 
const aa_state = require('aabot/aa_state.js');
const dag = require('aabot/dag.js');
const light_data_feeds = conf.bLight ? require('aabot/light_data_feeds.js') : null;
//
const bonded = require('./bonded.js');

function get_oracles (params) {
	let oracles = [];
	if (params.oracle1 && params.feed_name1) {
		let oracle1 = { oracle: params.oracle1, feed_name: params.feed_name1 }
		if (params.op1) oracle1.op = params.op1
		else oracle1.op = '*'
		oracles.push(oracle1);
	}
	if (params.oracle2 && params.feed_name2) {
		let oracle2 = { oracle: params.oracle2, feed_name: params.feed_name2 }
		if (params.op2) oracle2.op = params.op2
		else oracle2.op = '*'
		oracles.push(oracle1);
	}
	if (params.oracle3 && params.feed_name3) {
		let oracle3 = { oracle: params.oracle3, feed_name: params.feed_name3 }
		if (params.op3) oracle3.op = params.op3
		else oracle3.op = '*'
		oracles.push(oracle1);
	}
	return oracles;
}

async function get_oracle_price (oracles) {
	/// ??? what was 3 for in the following AA code ?
	/// ??? 	let oracle_price = reduce(oracles, 3, (price, oracle_info) => { ...
	let oracle_price = await oracles.reduce( async (price, oracle_info) => {
		if (conf.bLight)  
			await light_data_feeds.updateDataFeed(oracle_info.oracle, oracle_info.feed_name, true);
		let df_value = await dag.getDataFeed(oracle_info.oracle, oracle_info.feed_name);
		if (!df_value) return false
		if (oracle_info.op === '*') price = price * df_value
		else price = price / df_value
		return price
	}, 1);  // 1 is initial value of the price
	return oracle_price;
}

async function estimate_asset (curveAA, stableAA, GBYTEs) {
	// ** get upcomming state balances and state vars for all aas ** //
	const vars = aa_state.getUpcomingAAStateVars(curveAA);
	const params = await dag.readAAParams(curveAA);
	//
	//const vars_stable_aa = aa_state.getUpcomingAAStateVars(stableAA);
	//const tokens_stable = upcomingStateVars_stable_aa.supply
	//console.error('*** tokens_stable: ', tokens_stable)
	//	
	const oracles = get_oracles(params);
	const oraclePrice = await get_oracle_price(oracles);
	//
	const commonData = {
		params: params,
		vars: vars,
		oracle_price: oraclePrice,
		timestamp: Math.floor(Date.now() / 1000),
		isV2: true
	};
	const exchange = bonded.$get_exchange_result({
		tokens1: 0,
		tokens2: 0,
		tokens_stable: 0, // ???    
		addReserve: GBYTEs * 10 ** params.reserve_asset_decimals * 0.99,
		...commonData
	});
	console.error('excchange result from bonded.js : ', exchange)
	const expect_t2 = Math.abs(Math.trunc(exchange.expectNewT2));
	console.error('expect T2: ', 
		Number((expect_t2/10**params.decimals2)*exchange.growth_factor).toFixed(params.decimals2));
	return;
};

async function get_oswap_info () {
	const oswapAA = conf.oswapAA;
	await aa_state.followAA( oswapAA );  // follow oswap AA
	const oswapAA_params = await dag.readAAParams(oswapAA);
	const asset1 = oswapAA_params.asset0;
	const asset2 = oswapAA_params.asset1;
	const oswap_fee = oswapAA_params.swap_fee;
	const fee = oswap_fee / 1e11;
	/*
	const balances = aa_state.getUpcomingBalances();
	let asset1_params = await dag.readAAParams(asset1_curveAA);
	let asset1_decimals = asset1_params.decimals2; // note that this should be decimals2 not decimals1
	let balance1_raw = balances[oswapAA][asset1]
	let balance1 = balance1_raw / 10 ** asset1_decimals
	let balance2_raw = balances[oswapAA][asset2]
	let balance2 = balance2_raw / 10 ** asset2_decimals
	*/
	return;
}

eventBus.on('headless_wallet_ready', async () => {
	await operator.start();
	// let operator_address = operator.getAddress();  
	if (!conf.oswapAA) throw Error("Please specify oswap AA for token pair");
	if (!conf.asset1_curveAA) throw Error("Please specify curve AA for asset 1 of the token pair"); 
	if (!conf.asset2_curveAA) throw Error("Please specify curve AA for asset 2 of the token pair"); 

	network.start();

	// ** following asset 1 AAs ** //
	let asset1_curve_aa = conf.asset1_curveAA
	await aa_state.followAA( asset1_curve_aa ); 
	const asset1_fund_aa = await dag.readAAStateVar(asset1_curve_aa, 'fund_aa'); 
	const asset1_de_aa = await dag.readAAStateVar(asset1_curve_aa, 'decision_engine_aa');
	const asset1_stable_aa = 'KGMHPPH4H4K2HSRKFSBZLMDANQYC6DFN';
	await aa_state.followAA( asset1_fund_aa ); 
	await aa_state.followAA( asset1_de_aa ); 
	await aa_state.followAA( asset1_stable_aa );
	console.error('----- Following asset 1 curve aa: ', asset1_curve_aa)
	console.error('----- Following asset 1 fund aa: ', asset1_fund_aa)
	console.error('----- Following asset 1 de aa: ', asset1_de_aa)
	console.error('----- Following asset 1 stable aa: ', asset1_stable_aa)

	// ** step 1. find out how many asset1 we can get from ostable for initialGBYTEs ** //
	const GBYTEs = 500;
	const asset1 = await estimate_asset(asset1_curve_aa, asset1_stable_aa, GBYTEs);   
	
	// ** step2. find out how many asset 2 we can get from oswap for asset1 estimated in step 1 ** //
	// await get_oswap_info();
	// ** step3. find out how many finalGBYTEs we can get from ostable for asset2 estimated in step 2 ** //
	// ** step4. compate initialGBYTEs with finalGBYTEs, if positive, execute
});

process.on('unhandledRejection', up => { throw up; });
