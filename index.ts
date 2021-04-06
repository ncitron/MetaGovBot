import { watchAave } from "./protocols/aave";
import { watchCompound } from "./protocols/compound"
import { watchUniswap } from "./protocols/uniswap";

watchCompound();
watchAave();
watchUniswap();

console.log("watching for new proposals...")