if (typeof SmartStockAI === 'undefined') var SmartStockAI = {};

SmartStockAI.name = "Smart Stock AI";
SmartStockAI.version = "5.2";
SmartStockAI.GameVersion = "2.053";

SmartStockAI.launch = function(){

SmartStockAI.config = {
    enabled: 1,
    profile: "ultra",
    useInsugar: 1
};

SmartStockAI.stats = {
    invested: 0,
    sold: 0,
    profit: 0,
    trades: 0,
    winningTrades: 0,
    losingTrades: 0,
    bestTrade: 0,
    worstTrade: 0
};

SmartStockAI.state = {
    history:{},
    ema:{},
    entry:{},
    insugarRequested: 0
};

SmartStockAI.profiles = {
    ultra:{risk:0.20,buyZ:-0.7,sellZ:0.9,stop:0.10},
    balanced:{risk:0.15,buyZ:-0.5,sellZ:0.8,stop:0.12},
    aggressive:{risk:0.25,buyZ:-0.3,sellZ:0.6,stop:0.18}
};

SmartStockAI.init = function(){

    SmartStockAI.isLoaded = 1;

    SmartStockAI.ReplaceMenu();

    SmartStockAI.ensureInsugar();

    CCSE.MinigameReplacer(SmartStockAI.ReplaceMarket,"Bank");

};

SmartStockAI.ReplaceMenu = function(){

Game.customOptionsMenu.push(function(){
CCSE.AppendCollapsibleOptionsMenu(
SmartStockAI.name,
SmartStockAI.getMenu()
);
});

Game.customStatsMenu.push(function(){
CCSE.AppendStatsVersionNumber(
SmartStockAI.name,
SmartStockAI.version
);
});
};

SmartStockAI.getMenu = function(){

let m = CCSE.MenuHelper;
let str = '';

str += '<div class="listing">';
str += m.ToggleButton(
SmartStockAI.config,
'enabled',
'SSA_enabled',
'ON','OFF',
'SmartStockAI.Toggle'
);
str += m.ToggleButton(
SmartStockAI.config,
'useInsugar',
'SSA_insugar_enabled',
'Insugar ON','Insugar OFF',
'SmartStockAI.Toggle'
);
str += '</div>';

str += m.Header('Profile');

str += '<div class="listing">';
str += m.ActionButton("SmartStockAI.setProfile('ultra'); Game.UpdateMenu();","ULTRA AI");
str += m.ActionButton("SmartStockAI.setProfile('balanced'); Game.UpdateMenu();","Balanceado");
str += m.ActionButton("SmartStockAI.setProfile('aggressive'); Game.UpdateMenu();","Agressivo");
str += '<br><br>Atual: <b>'+SmartStockAI.config.profile+'</b>';
str += '</div>';

str += m.Header('Statistics');

str += '<div class="listing">';
let closedTrades = SmartStockAI.stats.winningTrades + SmartStockAI.stats.losingTrades;
let avgPerTrade = closedTrades > 0 ? SmartStockAI.stats.profit / closedTrades : 0;
let roi = SmartStockAI.stats.invested > 0 ? (SmartStockAI.stats.profit / SmartStockAI.stats.invested) * 100 : 0;
let winRate = closedTrades > 0 ? (SmartStockAI.stats.winningTrades / closedTrades) * 100 : 0;
str += 'Trades: '+SmartStockAI.stats.trades+'<br>';
str += 'Invested: '+Beautify(SmartStockAI.stats.invested)+'<br>';
str += 'Sold: '+Beautify(SmartStockAI.stats.sold)+'<br>';
str += 'Profit: '+Beautify(SmartStockAI.stats.profit)+'<br>';
str += 'ROI: '+Beautify(roi,2)+'%<br>';
str += 'Win rate: '+Beautify(winRate,2)+'% ('+SmartStockAI.stats.winningTrades+'/'+closedTrades+')<br>';
str += 'Avg P/L per closed trade: '+Beautify(avgPerTrade)+'<br>';
str += 'Best trade: '+Beautify(SmartStockAI.stats.bestTrade)+'<br>';
str += 'Worst trade: '+Beautify(SmartStockAI.stats.worstTrade);
str += '</div>';

return str;
};

SmartStockAI.Toggle = function(prefName,button,on,off,invert){
SmartStockAI.config[prefName] ^= 1;
l(button).innerHTML = SmartStockAI.config[prefName]?on:off;
};

SmartStockAI.setProfile = function(p){
SmartStockAI.config.profile = p;
};

SmartStockAI.ensureInsugar = function(){
if(!SmartStockAI.config.useInsugar) return;
if(typeof window !== 'undefined' && window.InsugarTrading) return;
if(SmartStockAI.state.insugarRequested) return;
SmartStockAI.state.insugarRequested = 1;
Game.LoadMod('https://staticvariablejames.github.io/InsugarTrading/InsugarTrading.js');
};

SmartStockAI.save = function(){
return JSON.stringify({
config:SmartStockAI.config,
stats:SmartStockAI.stats
});
};

SmartStockAI.load = function(str){
if (!str) return;

let data;
try {
data = JSON.parse(str);
} catch (e) {
return;
}

if (data && data.config) SmartStockAI.config = data.config;
if (typeof SmartStockAI.config.useInsugar === 'undefined') SmartStockAI.config.useInsugar = 1;
if (!SmartStockAI.profiles[SmartStockAI.config.profile]) SmartStockAI.config.profile = 'balanced';
if (data && data.stats) {
SmartStockAI.stats = Object.assign({}, SmartStockAI.stats, data.stats);
}
};

SmartStockAI.ReplaceMarket = function(){

if(!Game.customMinigame["Bank"].tick)
Game.customMinigame["Bank"].tick=[];

Game.customMinigame["Bank"].tick.push(SmartStockAI.logic);
};

SmartStockAI.logic = function(){

if(!SmartStockAI.config.enabled) return;

SmartStockAI.ensureInsugar();

const M = Game.Objects["Bank"].minigame;
const cfg = SmartStockAI.profiles[SmartStockAI.config.profile];
const bankLevel = Game.Objects["Bank"].level;
const hasInsugar = SmartStockAI.config.useInsugar && typeof window !== 'undefined' && window.InsugarTrading;

for(let i=0;i<M.goodsById.length;i++){

let g=M.goodsById[i];
let price=g.val;
let min=g.min;
let max=g.max;
if(max-min<=0) continue;

if(!SmartStockAI.state.history[i])
SmartStockAI.state.history[i]=[];

SmartStockAI.state.history[i].push(price);
if(SmartStockAI.state.history[i].length>25)
SmartStockAI.state.history[i].shift();

let mean=SmartStockAI.state.history[i].reduce((a,b)=>a+b,0)/SmartStockAI.state.history[i].length;
let variance=SmartStockAI.state.history[i].reduce((a,b)=>a+Math.pow(b-mean,2),0)/SmartStockAI.state.history[i].length;
let std=Math.sqrt(variance);

let k=2/(20+1);
if(!SmartStockAI.state.ema[i])
SmartStockAI.state.ema[i]=price;

SmartStockAI.state.ema[i]=price*k+SmartStockAI.state.ema[i]*(1-k);

let z=std>0?(price-SmartStockAI.state.ema[i])/std:0;
let rangePos=(price-min)/(max-min);

let maxInvest=Game.cookies*cfg.risk;
let invested=g.stock*price;

let canAnalyze = SmartStockAI.state.history[i].length >= 8;
let buySignal = canAnalyze && (rangePos < 0.45 || z < cfg.buyZ);
let entryPrice = SmartStockAI.state.entry[i] || price;
let stopSignal = g.stock > 0 && price <= entryPrice * (1 - cfg.stop);
let sellSignal = g.stock > 0 && (stopSignal || rangePos > 0.75 || z > cfg.sellZ);

if (hasInsugar) {
let q = window.InsugarTrading.inverseQuantile(bankLevel, i, price);
if (q !== null) {
buySignal = canAnalyze && (buySignal || q <= 0.18);
sellSignal = g.stock > 0 && (sellSignal || q >= 0.82);
}
}

if(buySignal && invested<maxInvest){
let amount=Math.floor((maxInvest-invested)/price);
if(amount>0){
let prevStock = g.stock;
M.buyGood(i,amount);
let bought = g.stock - prevStock;
if(bought>0){
let prevEntry = SmartStockAI.state.entry[i] || price;
SmartStockAI.state.entry[i] = ((prevEntry * prevStock) + (price * bought)) / (prevStock + bought);
SmartStockAI.stats.invested+=bought*price;
SmartStockAI.stats.trades++;
}
}
}

if(sellSignal){
let stockToSell=g.stock;
let avgEntry=(SmartStockAI.state.entry[i]||price);
M.sellGood(i,stockToSell);
let soldAmount = stockToSell - g.stock;
if(soldAmount>0){
let value=soldAmount*price;
let tradeProfit=value-avgEntry*soldAmount;
SmartStockAI.stats.sold+=value;
SmartStockAI.stats.profit+=tradeProfit;
if(tradeProfit>=0) SmartStockAI.stats.winningTrades++;
else SmartStockAI.stats.losingTrades++;
if(tradeProfit>SmartStockAI.stats.bestTrade) SmartStockAI.stats.bestTrade=tradeProfit;
if(tradeProfit<SmartStockAI.stats.worstTrade) SmartStockAI.stats.worstTrade=tradeProfit;
SmartStockAI.stats.trades++;
if(g.stock<=0) delete SmartStockAI.state.entry[i];
}
}
}
};

if(CCSE.ConfirmGameVersion(
SmartStockAI.name,
SmartStockAI.version,
SmartStockAI.GameVersion
))
Game.registerMod(SmartStockAI.name,SmartStockAI);
};

if(!SmartStockAI.isLoaded){
if(CCSE && CCSE.isLoaded){
SmartStockAI.launch();
}else{
if(!CCSE) var CCSE={};
if(!CCSE.postLoadHooks) CCSE.postLoadHooks=[];
CCSE.postLoadHooks.push(SmartStockAI.launch);
}
}
