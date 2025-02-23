import { Block, EntityComponentTypes, EntityInventoryComponent, ItemComponentTypes, ItemDurabilityComponent, ItemStack, Player, system as s, world as w } from "@minecraft/server";
import { MathUtils } from "mathUtils";

const PaletteKnife = {
    onUseOn(event) {
        const source = event.source as Player
        const block = event.block as Block
        const blockFace = event.blockFace

        //converts direction string to a vector
        let blockOffset;
        switch (blockFace) {
            case 'North':
                blockOffset = {x:0,y:0,z:-1};
            break;
            case 'South':
                blockOffset = {x:0,y:0,z:1};
            break;
            case 'East':
                blockOffset = {x:1,y:0,z:0};
            break;
            case 'West':
                blockOffset = {x:-1,y:0,z:0};
            break;
            case 'Up':
                blockOffset = {x:0,y:1,z:0};
            break;
            case 'Down':
                blockOffset = {x:0,y:-1,z:0};
            break;
        
            default:
            break;
        }

        //check if block can be placed (nothing is in the way)
        if(source.dimension.getBlock(MathUtils.addVectors(block.location,blockOffset)).isAir && 
            (source.dimension.getEntities({location:MathUtils.addVectors(block.location,MathUtils.addVectors(blockOffset,entityOffset)),maxDistance:0.7}).length == 0)) {
            let pt = []
            let pi = []

            //finds useable items in inventory
            ////needs better check, currently attempts to use non-placeable items, but the thrown error prevents issues on user end
            let playerInv = source.getComponent('minecraft:inventory') as EntityInventoryComponent;
            let playerCont = playerInv.container;
            for (let i = 0; i < 9; i++) {
                if(playerCont.getItem(i)) {
                    if (!playerCont.getItem(i).hasTag('minecraft:is_tool')) {
                        pt.push(playerCont.getItem(i).typeId);
                        pi.push(i);
                    }
                }
            }

            if (pt.length > 0) {
                //randomly select item from the list then places it, whilst also decreasing stack size
                const rand = Math.floor(Math.random()*pt.length);
                source.dimension.getBlock(MathUtils.addVectors(block.location,blockOffset)).setType(pt[rand]);
                let playerItem = new ItemStack(playerCont.getItem(pi[rand]).typeId, playerCont.getItem(pi[rand]).amount);
                if(source.getGameMode() == "survival") {
                    if(playerItem.amount-1!=0) {playerItem.amount-=1; playerCont.setItem(pi[rand],playerItem);}
                    else {source.runCommandAsync(`replaceitem entity @s slot.hotbar ${pi[rand]} air`)}
                }
            }
        }
    }
};

w.afterEvents.itemReleaseUse.subscribe((data)=> {
    const source = data.source;
    try {
        source.removeTag("using_blobblaster");
    } catch (error) {
        
    }
})

w.afterEvents.itemStartUse.subscribe((data)=> {
    const source = data.source;
    let itemstack = data.itemStack;
    try {
        source.addTag("using_blobblaster");
    } catch (error) {
        
    }

    source.runCommand(`tag @s list`)

    if (source.hasTag("using_blobblaster")) {
        let durability = itemstack.getComponent(ItemComponentTypes.Durability) as ItemDurabilityComponent;
        durability.damage = durability.damage - 1;
        source.runCommand(`say ${durability}`)
    }

})

s.runInterval(() => {
    const players = w.getAllPlayers();
    players.forEach(player => {
        if (player.getTags().includes("using_blobblaster")) {
            let projectile = player.dimension.spawnEntity("arrow",MathUtils.addVectors(player.location,{x:0,y:1.8,z:0}));
            let playerInv = player.getComponent('minecraft:inventory') as EntityInventoryComponent;
            let playerCont = playerInv.container;

            projectile.applyImpulse({x:player.getViewDirection().x*2, 
                y:player.getViewDirection().y*2+0.2, 
                z:player.getViewDirection().z*2})

            let durability = playerCont.getItem(player.selectedSlotIndex).getComponent(ItemComponentTypes.Durability) as ItemDurabilityComponent
            durability.damage = durability.damage +1;
            
            
        }
    });
},5)


const BlobBlaster = {
    onUse(event) {
        let source = event.source as Player;
        let itemstack = event.itemstack as ItemStack;
        
        source.runCommandAsync(`playanimation @s animation.kkonsplayer.blobblaster root 0.001 "!query.is_using_item"`);

    }
};

w.beforeEvents.worldInitialize.subscribe(({ itemComponentRegistry }) => {
    itemComponentRegistry.registerCustomComponent("kkons:paletteknife", PaletteKnife);
    itemComponentRegistry.registerCustomComponent("kkons:blobblaster", BlobBlaster);
});


//util
const entityOffset = {x:0.5,y:0.5,z:0.5}