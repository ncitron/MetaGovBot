import { watchAave } from "./protocols/aave";
import { watchCompound } from "./protocols/compound"

watchCompound();
watchAave();

console.log("watching for new proposals...")