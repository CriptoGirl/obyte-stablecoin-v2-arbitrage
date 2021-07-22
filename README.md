# Obyte Stablecoin V2 Arbitrage

Source code for O<sub>byte</sub> Stablecoin V2 Arbitrage AA for triangular arbitrage.
Let's say we have 3 trading pairs: 
-- GBYTE-OUSDV2 on ostable 
-- GBYTE-OETHV2 on ostable 
-- OUSDV2-OETHV2 on oswap 
Sometimes the tokens are mispriced and you can make a profit by going through 
-- GBYTE-OUSDV2-OETHV2-GBYTE path or 
-- GBYTE-OETHV2-OUSDV2-GBYTE path. 
When triggered, the AA should estimate if any of the paths would be profitable, estimate the optimal amount (to maximize the profit) and execute the trades. The AA holds its reserves in GBYTE, and every sequence of trades should start with GBYTE and end with (more) GBYTE. 

## Requirements

node.js 10+

## Install
```
npm install
```
## Run
```
node start.js
```
Pair witht the bot to monitor bot activity:
```
====== pairing code: TBC
```
Copy this pairing code to your O<sub>byte</sub> wallet: Chat tab, Add a new device, Accept invitation, paste the code, ready to ....

## Help

\#tech channel on discord https://discord.obyte.org.
