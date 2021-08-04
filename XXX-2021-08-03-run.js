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
let oswap_pairs = {}, oswap_aas = [], curve_aas = [];
let oswap_aa, oswap_params;
let asset1_curve_aa, asset1_vars, asset1_params = {}, asset1_decimals, asset1_commonData;
let asset2_curve_aa, asset2_vars, asset2_params = {}, asset2_decimals, asset2_commonData, asset2_stable_supply;
let balances, timestamp;

// ** 3. estimate final GBYTEs amount ** //
async function estimate_final_amount( asset2_t2 ) {
	console.error('..... estimating final GBYTE amount')
	const exchange = bonded.$get_exchange_result({
		tokens1: 0,
		tokens2: 0,
		tokens_stable: -asset2_t2,
		...asset2_commonData
	  });

	const reserve_asset_decimals = asset2_params.reserve_asset_decimals
	const finalGBYTEs = Number(exchange.payout).toFixed(reserve_asset_decimals)
	console.error('..... ..... final GBYTEs: ', finalGBYTEs / 10 ** reserve_asset_decimals )
	return;
}

/*
// ** 3. use bonded js to estimate asset2 t2 ** //
async function estimate_asset2_t2( asset2_stable_tokens ) {
	console.error('..... convert asset2 stable to asset2 T2 amount')

	const exchange = bonded.$get_exchange_result({
		tokens1: 0,
		tokens2: 0,
		tokens_stable: 0, 
		...asset2_commonData
	});

	const asset2_t2 = Number(asset2_stable_tokens / exchange.growth_factor).toFixed(asset2_decimals);
	console.error('..... ..... asset2_t2: ', asset2_t2 / 10 ** asset2_decimals)
	return;
}
*/

// ** see getAmountBought function in oswap.io src/helpers/_oswap/index.js ** //
function getAmountBought(inputAmount, inputReserve, outputReserve, swapFee) {
	const swapNoFee = 1e11 - swapFee;
	const numerator = inputAmount * outputReserve * swapNoFee;
	const denominator = inputReserve * 1e11 + inputAmount * swapNoFee;
	return Math.floor(numerator / denominator);
}
  
// ** 2. use oswap to estimate asset 2 stable ** //
 async function estimate_asset2_stable ( inputAmount ) {
	  console.error('..... estimating asset 2 amount')
	  const swapFee = oswap_params.swap_fee;
	  const inputReserve = balances[oswap_aa][oswap_params.asset0]
	  const outputReserve = balances[oswap_aa][oswap_params.asset1]
	  //
	  const amountBought = getAmountBought(inputAmount, inputReserve, outputReserve, swapFee)

	  console.error('..... ..... expected asset 2 stable amount: ', amountBought / 10 ** asset2_decimals)
	  return amountBought;
}

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
		oracles.push(oracle2);
	}
	if (params.oracle3 && params.feed_name3) {
		let oracle3 = { oracle: params.oracle3, feed_name: params.feed_name3 }
		if (params.op3) oracle3.op = params.op3
		else oracle3.op = '*'
		oracles.push(oracle3);
	}
	return oracles;
}

async function get_oracle_price (oracles) {
	let price = 1;
	for (var i in oracles) {
		let oracle_info = oracles[i]
		if (conf.bLight)  
			await light_data_feeds.updateDataFeed(oracle_info.oracle, oracle_info.feed_name, true);
		let df_value = await dag.getDataFeed(oracle_info.oracle, oracle_info.feed_name);
		if (!df_value) return false
		if (oracle_info.op === '*') price = price * df_value
		else price = price / df_value
	}
	return price;
}

// ** 1. use ostable bonded.js to estimate asset 1 ** //
async function estimate_asset1_stable (GBYTEs) {
	console.error('..... etimating asset 1 amount')

	const exchange = bonded.$get_exchange_result({
		tokens1: 0,
		tokens2: 0,
		tokens_stable: 0, 
		addReserve: GBYTEs * 10 ** asset1_params.reserve_asset_decimals * 0.99,
		...asset1_commonData
	});
	
	const expect_t2 = Math.abs(Math.trunc(exchange.expectNewT2));
	const expect_stable = Number( expect_t2 * exchange.growth_factor );
	const expect_stable_formated = 
		Number( (expect_t2 / 10 ** asset1_params.decimals2) * exchange.growth_factor )
		.toFixed(asset1_params.decimals2);

	console.error('..... ..... expect asset1 stable: ', expect_stable_formated)  
	return expect_stable;
};

// ** get params, vars, balances, oracle prices for asset 1 and 2, populate commonData objects ** //
async function getVarsParamsAndBalances () {
	console.error('..... getting vars, params & balances')
	timestamp = Math.floor(Date.now() / 1000)

	// ** get upcomming params & balances for oswap aa **//
	oswap_params = await dag.readAAParams(oswap_aa);

	// ** get upcomming state vars & latest params for asset 1 ** //
	asset1_vars = await aa_state.getUpcomingAAStateVars(asset1_curve_aa);
	const asset1_initial_params = await dag.readAAParams(asset1_curve_aa);
	Object.keys(asset1_initial_params).forEach((name) => {
		asset1_params[name] = asset1_vars[name] || asset1_initial_params[name] })
	asset1_decimals = asset1_params.decimals2; // note that this should be decimals2 not decimals1
	
	// ** get upcomming state vars & latest params for asset 2 ** //
	asset2_vars = await aa_state.getUpcomingAAStateVars(asset2_curve_aa);
	const asset2_initial_params = await dag.readAAParams(asset2_curve_aa);
	Object.keys(asset2_initial_params).forEach((name) => {
		asset2_params[name] = asset2_vars[name] || asset2_initial_params[name] })
	asset2_decimals = asset2_params.decimals2; // note that this should be decimals2 not decimals1
	//
	const asset2_stable_vars = await aa_state.getUpcomingAAStateVars(conf.asset2_stableAA);
	asset2_stable_supply = asset2_stable_vars.supply;

	// ** get Balances ** //	
	balances = await aa_state.getUpcomingBalances();

	// ** get oralce price for asset 1 and populate asset1 commonData object ** //
	const asset1_oracles = get_oracles(asset1_params);
	const asset1_oraclePrice = await get_oracle_price(asset1_oracles);
	asset1_commonData = {
		params: asset1_params,
		vars: asset1_vars,
		oracle_price: asset1_oraclePrice,
		timestamp: timestamp, 	
		isV2: true
	};

	// ** get oralce price for asset 2 and populate asset2 commonData object ** //
	const asset2_oracles = get_oracles(asset2_params);
	const asset2_oraclePrice = await get_oracle_price(asset2_oracles);
	asset2_commonData = {
		params: asset2_params,
		vars: asset2_vars,
		oracle_price: asset2_oraclePrice,
		timestamp: timestamp, 	
		isV2: true
	};
	
	return;
}

async function followAssetAAs( asset, curve_aa) {
	await aa_state.followAA( curve_aa );
	//console.error('Following ', asset, ' curve aa: ', curve_aa)
	let fund_aa = await dag.readAAStateVar(curve_aa, 'fund_aa')
	await aa_state.followAA( fund_aa );
	//console.error('Following ', asset, ' fund aa: ', fund_aa)
	
	let de_aa = await dag.readAAStateVar(curve_aa, 'decision_engine_aa')
	await aa_state.followAA( de_aa );
	//console.error('Following ', asset, ' de aa: ', de_aa)
	let gov_aa = await dag.readAAStateVar(curve_aa, 'governance_aa')
	await aa_state.followAA( gov_aa );
	//console.error('Following ', asset, ' gov aa: ', de_aa)
	if (asset === 'asset 1') {
		await aa_state.followAA( conf.asset1_stableAA );
		//console.error('Following asset 1 stable aa: ', conf.asset1_stableAA);
	}
	else {
		await aa_state.followAA( conf.asset2_stableAA );
		//console.error('Following asset 2 stable aa: ', asset2_stable_aa);
	}
	return;
}

async function followAAs() { 
	console.error('..... following AAs')
	await aa_state.followAA( conf.oswapAA );
	//console.error('following oswap aa: ', conf.oswapAA)
	await followAssetAAs( 'asset 1', asset1_curve_aa )
	await followAssetAAs( 'asset 2', asset2_curve_aa )
	return;
}

async function getOswapAAs() {
	let oswap_factory
	if (!conf.oswap_factory) throw Error("Please specify oswap factory");
	else oswap_factory = conf.oswap_factory;
	//
	await aa_state.followAA( oswap_factory );
	let factory_vars_obj = aa_state.getUpcomingAAStateVars( oswap_factory );
	let factory_vars = Object.keys(factory_vars_obj);
	for (let factory_var of factory_vars) { 
		var var_arr = factory_var.split('.');
		if ( var_arr[0] === 'pools' && !oswap_aas[var_arr[1]] ) {
			let oswap_aa = var_arr[1]

			await aa_state.followAA( oswap_aa );
			let oswap_params = await dag.readAAParams(oswap_aa);
			// get asset 0 info 
			let asset0 = { asset: oswap_params.asset0 }
			if (oswap_params.asset0 !== 'base') {
				const asset0_objJoint = await dag.readJoint(oswap_params.asset0);
				for (let asset0_message of asset0_objJoint.unit.messages) {
					if (asset0_message.app === 'data') asset0.curve_aa = asset0_message.payload.curve_aa
				}
			}
			// get asset 1 info 
			let asset1 = { asset: oswap_params.asset1 }
			if (oswap_params.asset1 !== 'base') {
				const asset1_objJoint = await dag.readJoint(oswap_params.asset1);
				for (let asset1_message of asset1_objJoint.unit.messages) {
					if (asset1_message.app === 'data') asset1.curve_aa = asset1_message.payload.curve_aa
				}
			}
			// crete oswap object & add it to the oswap_aas object
			if (oswap_aa && asset0 && asset1 && oswap_params.swap_fee) {
				// crete oswap object & add it to the oswap_pairs object
				oswap_pairs[oswap_aa] = {
					oswap_aa: oswap_aa,
					asset0: asset0,
					asset1: asset1,
					swap_fee: oswap_params.swap_fee
				}
				// add oswap aa to oswap_aas array 
				oswap_aas.push(oswap_aa);
				// add curve aas to curve_aas array
				if ( !curve_aas.includes(asset0.curve_aa) ) curve_aas.push(asset0.curve_aa);
				if ( !curve_aas.includes(asset1.curve_aa) ) curve_aas.push(asset1.curve_aa);
			}
		}
	}
	return;
}

function checkAndAssignConfigData() {
	console.error('..... checking config')
	if (!conf.oswapAA) throw Error("Please specify oswap AA for token pair");
	else oswap_aa = conf.oswapAA;
	
	if (!conf.asset1_curveAA) throw Error("Please specify curve AA for asset 1 of the token pair"); 
	else asset1_curve_aa = conf.asset1_curveAA;
	
	if (!conf.asset1_stableAA) throw Error("Please specify stable AA for asset 1 of the token pair"); 
	
	if (!conf.asset2_curveAA) throw Error("Please specify curve AA for asset 2 of the token pair"); 
	else asset2_curve_aa = conf.asset2_curveAA
	
	if (!conf.asset2_stableAA) throw Error("Please specify stable AA for asset 2 of the token pair"); 
	return;
}

eventBus.on('headless_wallet_ready', async () => {
	await operator.start();
	// let operator_address = operator.getAddress();

	network.start();

	//await checkAndAssignConfigData();
	await getOswapAAs();
	//console.error('sample oswap_pairs: ', oswap_aas.IX3BHPN433VVJCBZKT4UBSDGFSRW4TD5)
	console.error( 'oswap pairs: ', oswap_pairs )
	console.error( 'oswap_aas: ', oswap_aas )
	console.error( 'cuver_aas: ', curve_aas )
	return;
	
	// ** following oswap, asset 1 & asset 2 AAs ** //
	await followAAs();
	
	// ** get latest vars, params and balances for oswap aa, asset 1 & asset 2 ** //
	await getVarsParamsAndBalances();

	// ** step 1. find out how many asset1 (e.g. OUSDV2) we can get from ostable for GBYTEs ** //
	const GBYTEs = 10; //500;
	const asset1Stable = await estimate_asset1_stable( GBYTEs );   
	
	// ** step2. find out how many asset 2 we can get from oswap for asset1 estimated in step 1 ** //
	const asset2Stable = await estimate_asset2_stable( asset1Stable );

	// ** step3. find out how many interest tokens (T2) equivalent of asset2 stable estimated in step 2 ** //
	if (asset2Stable > asset2_stable_supply) {
		console.error('Error: exceeds stable supply');
		return;
	}
	///const asset2T2 = await estimate_asset2_t2( asset2Stable );
	const finalGBYTEs = await estimate_final_amount( asset2Stable );
	
	// ** step4. compate initialGBYTEs with finalGBYTEs, if positive, execute
});

process.on('unhandledRejection', up => { throw up; });
