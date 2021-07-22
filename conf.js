/*jslint node: true */
"use strict";

// these can be overridden with conf.json file in data folder
exports.deviceName = 'Obyte Stablecoin V2 Arbitrage';
exports.bLight = true;
exports.hub = process.env.testnet ? 'obyte.org/bb-test' : 'obyte.org/bb';
exports.bNoPassphrase = true;
exports.payout_address = ''; // where Bytes can be moved manually.
exports.control_addresses = [''];  // if required, add to local conf.json file; device address to chat
exports.permanent_pairing_secret = '*'; // * allows to pair with any code

// do not change
exports.storage = 'sqlite';
exports.bSingleAddress = true;
exports.KEYS_FILENAME = 'keys.json';

// config used by t1 arbitrage project
exports.bServeAsHub = false;  /// ???
exports.bWantNewPeers = true; /// ???
//
exports.oswapAA = 'IX3BHPN433VVJCBZKT4UBSDGFSRW4TD5';
exports.asset1_curveAA = 'VLKI3XMMX5YULOBA6ZXBXDPI6TXF6V3D';
exports.asset2_curveAA = 'MMN3JBJWTT7ZZL7I7K66GSZQ3MHTPW47';
///
///exports.explicitStart = true;
///exports.min_reserve_delta = 1e8;
///exports.min_distance_delta = 1e-3;
///exports.arb_aas = ['']; // set in conf.json
///exports.buffer_base_aas = ['VXY4L4NGFQ773NOQKUFFVJEWLZUBCYHI', '6UZ3XA5M6B6ZL5YSBLTIDCCVAQGSYYWR'];
///// TOR
///exports.socksHost = '127.0.0.1';  
///exports.socksPort = 9050;

// config used by my trigger bot project
///exports.admin_email = '';
///exports.from_email = '';
exports.bIgnoreUnpairRequests = true;  /// ???
exports.bStaticChangeAddress = true; /// ???
///exports.base_aas = ['3DGWRKKWWSC6SV4ZQDWEHYFRYB4TGPKX', 'CD5DNSVS6ENG5UYILRPJPHAB3YXKA63W']; 
///exports.factory_aas = ['CX56T625MQDCRCQTJGYZYYWUAMCEZT2Q','YSVSAICPH5XOZPZL5UVH56MVHQKMXZCM'];
///exports.exclude_curve_aas = ['PU5YFREC4OBEYADLOHMBEEA4CI2Z5AKA'];
///exports.interval = 60 * 5; //60 * 10; // 60 seconds * 10 = 10 minutes

console.log('finished conf');

//exports.port = 6611;
//exports.myUrl = 'wss://mydomain.com/bb';
// for local testing
//exports.WS_PROTOCOL === 'ws://';
//exports.port = 16611;
//exports.myUrl = 'ws://127.0.0.1:' + exports.port;
