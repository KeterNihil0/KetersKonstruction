import { Block, Dimension, Entity, EntityComponentTypes, EntityEquippableComponent, EntityInventoryComponent, EquipmentSlot, ItemComponentTypes, ItemDurabilityComponent, ItemStack, Player, system as s, world as w } from "@minecraft/server";
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
                try {
                    source.dimension.getBlock(MathUtils.addVectors(block.location,blockOffset)).setType(pt[rand]);
                    let playerItem = new ItemStack(playerCont.getItem(pi[rand]).typeId, playerCont.getItem(pi[rand]).amount);
                    if(source.getGameMode() == "survival") {
                        if(playerItem.amount-1!=0) {playerItem.amount-=1; playerCont.setItem(pi[rand],playerItem);}
                        else {source.runCommandAsync(`replaceitem entity @s slot.hotbar ${pi[rand]} air`)}
                    }
                } catch (error) {
                    
                }
            }
        }
    }
};

w.afterEvents.itemStopUse.subscribe((data)=> {
    
    //will attempt to remove any "Using" tags from the player
    const source = data.source;
    try {
        source.removeTag("using_blobblaster");
    } catch (error) {
        
    }
})

w.afterEvents.itemStartUse.subscribe((data)=> {
    const source = data.source;
    let itemstack = data.itemStack;
 
    if (itemstack.typeId.includes("kkons:blobblaster")) {

        //change blaster ammo
        if (source.isSneaking) {

            //checks if there is ammo left in blaster, if so creates a cell with correct durability
            {
                let newBlaster = new ItemStack("kkons:blobblaster");

                let durability = itemstack.getComponent(ItemComponentTypes.Durability) as ItemDurabilityComponent
                let oldAmmo = new ItemStack("minecraft:air", 1);

                if (itemstack.typeId != "kkons:blobblaster") {
                    if (durability.damage < durability.maxDurability) {
                        if (itemstack.hasTag("kkons:blaster_goo")) {
                            oldAmmo = new ItemStack("kkons:blobblastercell_goo", 1);

                        } else if (itemstack.hasTag("kkons:blaster_sandy")) {
                            oldAmmo = new ItemStack("kkons:blobblastercell_sandy", 1);
                        }

                        let oldAmmoDurability = oldAmmo.getComponent(ItemComponentTypes.Durability) as ItemDurabilityComponent
                        oldAmmoDurability.damage = durability.damage;

                    } else {
                        oldAmmo = new ItemStack("kkons:blobblastercell_empty", 1);
                    }
                }

                //reload handler
                {
                    let playerEquip = source.getComponent(EntityComponentTypes.Equippable) as EntityEquippableComponent
                    if (playerEquip.getEquipmentSlot(EquipmentSlot.Offhand).getItem()) {
                        let newAmmo = playerEquip.getEquipmentSlot(EquipmentSlot.Offhand).getItem();
                        if (newAmmo.hasTag("kkons:cell_goo")) {
                            newBlaster = new ItemStack("kkons:blobblaster_goo");
                        }
                        else if (newAmmo.hasTag("kkons:cell_sandy")) {
                            newBlaster = new ItemStack("kkons:blobblaster_sandy");
                        } else {
                            newBlaster = itemstack;
                        }
                        source.runCommand(`say now loading ${newAmmo.typeId} into ${newBlaster.typeId}`)
                        let newBlasterDurability = newBlaster.getComponent(ItemComponentTypes.Durability) as ItemDurabilityComponent
                        let newAmmoDurability = newAmmo.getComponent(ItemComponentTypes.Durability) as ItemDurabilityComponent
                        newBlasterDurability.damage = newAmmoDurability.damage;
                    }

                    if (newBlaster != itemstack) {
                        playerEquip.setEquipment(EquipmentSlot.Mainhand, newBlaster);
                        let mainhand = playerEquip.getEquipmentSlot(EquipmentSlot.Offhand);
                        if (mainhand.amount > 1) mainhand.amount--;
                        else mainhand.setItem(undefined);
                        
                        let playerInv = source.getComponent(EntityComponentTypes.Inventory) as EntityInventoryComponent
                        playerInv.container.addItem(oldAmmo);
                    }
                }
            }
        }
        else {

            //will attempt to attach "using" tags to the player
            if (itemstack.typeId != "kkons:blobblaster") {
                try {
                    source.addTag("using_blobblaster");
                } catch (error) {

                }
            }
        }
    }

    if (itemstack.typeId == "kkons:blobblastercell_virus") {

    }
})

w.afterEvents.itemUseOn.subscribe((data)=> {
    const block = data.block;
    const source = data.source;
    const itemstack = data.itemStack;
    let playerEquip = source.getComponent(EntityComponentTypes.Equippable) as EntityEquippableComponent

    if (itemstack.typeId == "kkons:blobblastercell_virus") {
        if (block.typeId.includes("kkons:blobblaster_block")) {
            block.setType("kkons:blobblaster_block_virus");
            if(itemstack.amount>1) {itemstack.amount = itemstack.amount--}
        }
    }
})

s.runInterval(() => {
    const players = w.getAllPlayers();
    players.forEach(player => {

        //Handles blob blaster projectiles, needs moving to a function
        if (player.getTags().includes("using_blobblaster")) {
            let playerInv = player.getComponent('minecraft:inventory') as EntityInventoryComponent;
            let playerCont = playerInv.container;
            let blobblasterItem = playerCont.getItem(player.selectedSlotIndex) as ItemStack
            let durability = blobblasterItem.getComponent(ItemComponentTypes.Durability) as ItemDurabilityComponent
            let blasterAmmo = "none"

            if (blobblasterItem.hasTag("kkons:blaster_goo")) {
                blasterAmmo = "kkons:blobblaster_se_goo"
            } else if (blobblasterItem.hasTag("kkons:blaster_sandy")){
                blasterAmmo = "kkons:blobblaster_se_sandy"
            }

            if (durability.damage < durability.maxDurability && blasterAmmo != "none") {

                //need to add other goo variants
                let projectile = player.dimension.spawnEntity(blasterAmmo,MathUtils.addVectors(player.location,{x:0,y:1.6,z:0}));
                player.runCommandAsync(`playsound fall.slime @a ${player.location.x} ${player.location.y} ${player.location.z} 0.5`)
                //impulse/velocity = player aim
                projectile.applyImpulse({x:player.getViewDirection().x*2, 
                    y:player.getViewDirection().y*2+0.2, 
                    z:player.getViewDirection().z*2})

                durability.damage = durability.damage + 1;
                playerCont.setItem(player.selectedSlotIndex, blobblasterItem);
            }
        }
    });

    //handles blobblaster goo, need to add variants maybe run a function with variants parameters?
    w.getDimension("overworld").getEntities({type:"kkons:blobblaster_se_goo"}).forEach(goo => {

        const entity = "kkons:blobblaster_se_goo";
        const block = "kkons:blobblaster_block_goo";

        //prevents immediately turning solid on player
        if((+goo.getProperty("kkons:lifetime") < 10)) { goo.setProperty("kkons:lifetime", +goo.getProperty("kkons:lifetime")+1); }

        //turns goo solid when not moving
        if((Math.abs(goo.getVelocity().x)+Math.abs(goo.getVelocity().y)+Math.abs(goo.getVelocity().z) < 0.1) && +goo.getProperty("kkons:lifetime") > 1) {
            
            //fills local area with solid "goo", shall add variants using a switch case for goo type
            goo.runCommand(`fill ~-1~-1~-1 ~1~1~1 ${block} replace air`);
            goo.runCommand(`fill ~-1~-1~-1 ~1~1~1 ${block} replace short_grass`);
            goo.runCommand(`fill ~-1~-1~-1 ~1~1~1 ${block} replace tall_grass`);
            goo.remove();
        }
    });

    w.getDimension("overworld").getEntities({type:"kkons:blobblaster_se_sandy"}).forEach(goo => {
        const entity = "kkons:blobblaster_se_sandy";
        const block = "kkons:blobblaster_block_sandy";
        //prevents immediately turning solid on player
        if((+goo.getProperty("kkons:lifetime") < 10)) { goo.setProperty("kkons:lifetime", +goo.getProperty("kkons:lifetime")+1); }

        //turns goo solid when not moving
        if((Math.abs(goo.getVelocity().x)+Math.abs(goo.getVelocity().y)+Math.abs(goo.getVelocity().z) < 0.1) && +goo.getProperty("kkons:lifetime") > 1) {
            
            if(!goo.getProperty("kkons:falling")) {
                //fills local area with solid "goo", shall add variants using a switch case for goo type
                goo.runCommand(`fill ~-1~-1~-1 ~1~1~1 ${block} replace air`);
                goo.runCommand(`fill ~-1~-1~-1 ~1~1~1 ${block} replace short_grass`);
                goo.runCommand(`fill ~-1~-1~-1 ~1~1~1 ${block} replace tall_grass`);
                goo.remove();
            } else if((goo.dimension.getBlock(goo.location).below(0).isValid)) {
                goo.dimension.getBlock(goo.location).setType(block);
                goo.remove();
            }
        }
    })
},4)


const BlobBlaster = {
    onUse(event) {
        let source = event.source as Player;
        let itemstack = event.itemstack as ItemStack;
        
        //handles gun animations
        source.runCommandAsync(`playanimation @s animation.kkonsplayer.blobblaster root 0.001 "!query.equipped_item_any_tag('slot.weapon.mainhand', 'kkons:blaster')"`);

    }
};

/** @type {import("@minecraft/server").BlockCustomComponent} */
const GooVirus = {
    onTick(event) {
        const block = event.block as Block;
        const dimension = event.dimension as Dimension;
        const bl = block.location

        dimension.runCommandAsync(`fill ${bl.x - 1} ${bl.y - 1} ${bl.z - 1} ${bl.x + 1} ${bl.y + 1} ${bl.z + 1} kkons:blobblaster_block_virus replace kkons:blobblaster_block_goo`);
        dimension.runCommandAsync(`fill ${bl.x - 1} ${bl.y - 1} ${bl.z - 1} ${bl.x + 1} ${bl.y + 1} ${bl.z + 1} kkons:blobblaster_block_virus replace kkons:blobblaster_block_sandy`);
        dimension.runCommandAsync(`playsound mob.player.hurt_on_fire @a ${bl.x} ${bl.y} ${bl.z} 0.5 0.5`)
        dimension.runCommandAsync(`particle minecraft:water_evaporation_bucket_emitter ${bl.x} ${bl.y} ${bl.z}`)
        block.setType("minecraft:air");
    }
}

/** @type {import("@minecraft/server").BlockCustomComponent} */
const GooInteract = {
    onPlayerInteract(event) {
        const block = event.block as Block;
        let source = event.source as Player;
        if(!source) return;

        if(source.isSneaking) {event.cancel; return;}

        const equippable = source.getComponent(EntityComponentTypes.Equippable) as EntityEquippableComponent;
        if (!equippable) return;

        const mainhand = equippable.getEquipmentSlot(EquipmentSlot.Mainhand);
        if (!mainhand.hasItem() || mainhand.typeId !== "kkons:blobblastercell_virus") return;

        block.setType("kkons:blobblaster_block_virus");

        if (mainhand.amount > 1) mainhand.amount--;
        else mainhand.setItem(undefined);
    }
}

/** @type {import("@minecraft/server").BlockCustomComponent} */
const GravityBlock = {
    onTick(event) {
        const block = event.block as Block;
        const dimension = event.dimension as Dimension;
        const bl = block.location;
        const bl1 = block.dimension.getBlock(MathUtils.addVectors(bl, blockBelow))
        if (bl1?.isAir || bl1?.isLiquid || !bl1.isValid()) {
            block.setType("minecraft:air");
            let fallingEntity = dimension.spawnEntity("kkons:blobblaster_se_sandy",MathUtils.addVectors(bl,entityOffset));
            fallingEntity.setProperty("kkons:falling",true)
            fallingEntity.applyImpulse({x:0,y:-0.1,z:0});
        }
    }
}

w.beforeEvents.worldInitialize.subscribe(({ itemComponentRegistry }) => {
    itemComponentRegistry.registerCustomComponent("kkons:paletteknife", PaletteKnife);
    itemComponentRegistry.registerCustomComponent("kkons:blobblaster", BlobBlaster);
});

w.beforeEvents.worldInitialize.subscribe(({ blockComponentRegistry }) => {
    blockComponentRegistry.registerCustomComponent("kkons:goo_virus", GooVirus);
    blockComponentRegistry.registerCustomComponent("kkons:goo_interact", GooInteract);
    blockComponentRegistry.registerCustomComponent("kkons:gravity_block", GravityBlock);
});


//util
const entityOffset = {x:0.5,y:0.5,z:0.5}
const blockBelow = {x:0,y:-1,z:0}