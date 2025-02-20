import { ItemStack, world as w } from "@minecraft/server";
import { MathUtils } from "mathUtils";
const PaletteKnife = {
    onUseOn(event) {
        const source = event.source;
        const block = event.block;
        const blockFace = event.blockFace;
        //converts direction string to a vector
        let blockOffset;
        switch (blockFace) {
            case 'North':
                blockOffset = { x: 0, y: 0, z: -1 };
                break;
            case 'South':
                blockOffset = { x: 0, y: 0, z: 1 };
                break;
            case 'East':
                blockOffset = { x: 1, y: 0, z: 0 };
                break;
            case 'West':
                blockOffset = { x: -1, y: 0, z: 0 };
                break;
            case 'Up':
                blockOffset = { x: 0, y: 1, z: 0 };
                break;
            case 'Down':
                blockOffset = { x: 0, y: -1, z: 0 };
                break;
            default:
                break;
        }
        //check if block can be placed (nothing is in the way)
        if (source.dimension.getBlock(MathUtils.addVectors(block.location, blockOffset)).isAir &&
            (source.dimension.getEntities({ location: MathUtils.addVectors(block.location, MathUtils.addVectors(blockOffset, entityOffset)), maxDistance: 0.7 }).length == 0)) {
            let pt = [];
            let pi = [];
            //finds useable items in inventory
            ////needs better check
            let playerInv = source.getComponent('minecraft:inventory');
            let playerCont = playerInv.container;
            for (let i = 0; i < 9; i++) {
                if (playerCont.getItem(i)) {
                    if (!playerCont.getItem(i).hasTag('minecraft:is_tool')) {
                        pt.push(playerCont.getItem(i).typeId);
                        pi.push(i);
                    }
                }
            }
            if (pt.length > 0) {
                //randomly select valid item from the list then places it, whilst also decreasing stack size
                const rand = Math.floor(Math.random() * pt.length);
                source.dimension.getBlock(MathUtils.addVectors(block.location, blockOffset)).setType(pt[rand]);
                let playerItem = new ItemStack(playerCont.getItem(pi[rand]).typeId, playerCont.getItem(pi[rand]).amount);
                if (playerItem.amount - 1 != 0) {
                    playerItem.amount -= 1;
                    playerCont.setItem(pi[rand], playerItem);
                }
                else {
                    source.runCommandAsync(`replaceitem entity @s slot.hotbar ${pi[rand]} air`);
                }
            }
        }
    }
};
w.beforeEvents.worldInitialize.subscribe(({ itemComponentRegistry }) => {
    itemComponentRegistry.registerCustomComponent("kkons:paletteknife", PaletteKnife);
});
//util
const entityOffset = { x: 0.5, y: 0.5, z: 0.5 };
