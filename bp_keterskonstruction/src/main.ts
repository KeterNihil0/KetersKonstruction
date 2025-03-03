import { Block, BlockComponentTickEvent, Dimension, Entity, EntityComponentTypes, EntityEquippableComponent, EntityInventoryComponent, EntityTameableComponent, EquipmentSlot, ItemComponentTypes, ItemCooldownComponent, ItemDurabilityComponent, ItemStack, Player, system as s, Vector3, world as w } from "@minecraft/server";
import { MathUtils } from "mathUtils";
import { mcArray } from "mcArrays";

w.beforeEvents.worldInitialize.subscribe(({ itemComponentRegistry }) => {
    itemComponentRegistry.registerCustomComponent('kkons:paletteknife', PaletteKnife);
    itemComponentRegistry.registerCustomComponent('kkons:blobblaster', BlobBlaster);
});

//w.beforeEvents.worldInitialize
w.beforeEvents.worldInitialize.subscribe(({ blockComponentRegistry }) => {
    blockComponentRegistry.registerCustomComponent('kkons:goo_virus', GooVirus);
    blockComponentRegistry.registerCustomComponent('kkons:gravity_block', GravityBlock);
});


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
                        else {source.runCommand(`replaceitem entity @s slot.hotbar ${pi[rand]} air`)}
                    }
                } catch (error) {
                    
                }
            }
        }
    }
};

w.beforeEvents.playerBreakBlock.subscribe((data) => {
    let source = data.player;
    let itemStack = data.itemStack;
    let block = data.block;

    if(itemStack!=undefined){
    if(itemStack.typeId.includes("kkons:blobblaster_") && !itemStack.typeId.includes("cell")) {
            s.run(()=>{gooSmoothV3(source.dimension,block.location,4);});
        }
    }
})

w.afterEvents.itemStopUse.subscribe((data)=> {

    //data.source.setDynamicProperty("kkons:blockblaster_charge", 0);
    
    //will attempt to remove any "Using" tags from the player
    const source = data.source;
    if (source.hasTag("using_blobblaster")) {
        try {
            source.removeTag("using_blobblaster");
            if(+source.getDynamicProperty("kkons:blobblaster_charge") > 0) {
                blobBlasterShoot(source);
                source.setDynamicProperty("kkons:blobblaster_charge", 0);
                //console.log(`Blobblaster should fire \n player blobblaster count is now ${JSON.stringify(source.getDynamicProperty("kkons:blobblaster_charge"))}`)
            }
        } catch (error) {

        }
    } 

    //source.setDynamicProperty("kkons:blockblaster_charge", 0);

    if (source.hasTag("using_blockblaster")) {
        try {
            source.removeTag("using_blockblaster");
            if(+source.getDynamicProperty("kkons:blockblaster_charge") > 0) {
                blockBlasterShoot(source);
                source.setDynamicProperty("kkons:blockblaster_charge", 0);
                console.log(source.getDynamicProperty("kkons:blockblaster_charge"))
            }
        } catch (error) {

        }
    } 
})

w.afterEvents.itemUse.subscribe((data)=> {
    const source = data.source;
    let itemstack = data.itemStack;
 
    if (itemstack.typeId.includes("kkons:blobblaster") && !itemstack.typeId.includes("cell") && itemstack.typeId != "kkons:blobblaster" && !source.isSneaking) {
        //source.runCommand(`say player using Blobblaster`);
        try {
            source.addTag("using_blobblaster");
        } catch (error) {}
    }

    if (itemstack.typeId.includes("kkons:blockblaster") && !source.isSneaking) {
        //source.runCommand(`say player using Blockblaster`);
        try {
            source.addTag("using_blockblaster");
            console.log(`using blockblaster`)
        } catch (error) {}
    }
})

w.afterEvents.itemStartUse.subscribe((data)=> {
    const source = data.source;
    let itemstack = data.itemStack;
 
    if (itemstack.typeId.includes("kkons:blobblaster") && !itemstack.typeId.includes("cell")) {

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
                            oldAmmo = new ItemStack("kkons:blobblaster_cell_goo", 1);

                        } else if (itemstack.hasTag("kkons:blaster_sandy")) {
                            oldAmmo = new ItemStack("kkons:blobblaster_cell_sandy", 1);
                        }

                        let oldAmmoDurability = oldAmmo.getComponent(ItemComponentTypes.Durability) as ItemDurabilityComponent
                        oldAmmoDurability.damage = durability.damage;

                    } else {
                        oldAmmo = new ItemStack("kkons:blobblaster_cell_empty", 1);
                    }
                }

                //reload handler
                {
                    let playerEquip = source.getComponent(EntityComponentTypes.Equippable) as EntityEquippableComponent
                    if (playerEquip.getEquipmentSlot(EquipmentSlot.Offhand).getItem()) {
                        let newAmmo = playerEquip.getEquipmentSlot(EquipmentSlot.Offhand)?.getItem();

                        //get goo cel type and corresponding blaster type
                        if (newAmmo.hasTag("kkons:cell_goo")) {
                            newBlaster = new ItemStack("kkons:blobblaster_goo");
                        }
                        else if (newAmmo.hasTag("kkons:cell_sandy")) {
                            newBlaster = new ItemStack("kkons:blobblaster_sandy");
                        } else {
                            newBlaster = itemstack;
                        }
                        let newBlasterDurability = newBlaster.getComponent(ItemComponentTypes.Durability) as ItemDurabilityComponent
                        let newAmmoDurability = newAmmo.getComponent(ItemComponentTypes.Durability) as ItemDurabilityComponent
                        newBlasterDurability.damage = newAmmoDurability.damage;
                    }

                    if (newBlaster != itemstack) {
                        playerEquip.setEquipment(EquipmentSlot.Mainhand, newBlaster);
                        let offhand = playerEquip.getEquipmentSlot(EquipmentSlot.Offhand);
                        if (offhand.getItem()) {
                            if (offhand.amount > 1) offhand.amount--;
                            else offhand.setItem(undefined);
                        }
                        
                        let playerInv = source.getComponent(EntityComponentTypes.Inventory) as EntityInventoryComponent
                        playerInv.container.addItem(oldAmmo);
                    }
                }
            }
        }
    }
})

w.beforeEvents.playerInteractWithBlock.subscribe((data)=> {
    const source = data.player;
    const block = data.block;

    if(!source) {return;}

    const equippable = source.getComponent(EntityComponentTypes.Equippable) as EntityEquippableComponent;
    if (!equippable) return;

    const mainhand = equippable.getEquipmentSlot(EquipmentSlot.Mainhand);

    if (mainhand.hasItem() && data.isFirstEvent) {
        if (source.isSneaking && mainhand.typeId == "kkons:blobblaster_cell_virus" || mainhand.typeId == "kkons:blobblaster_cell_viralgoo")
        {
            s.run(()=> {gooVirus(block,source,mainhand);});
            data.cancel;
        }
        if (mainhand.typeId == "kkons:blockblaster") {
            s.run(()=> {blockBlasterSelect(block,source);});
        }
    }
})

w.afterEvents.projectileHitBlock.subscribe((data) => {
    let projectile = data.projectile;
    if (projectile.typeId.includes("kkons:blobblaster")) {
        s.run(()=>{gooHandlerV2(projectile)});
    }

    if (projectile.typeId.includes("kkons:blockblaster")) {
        s.run(()=>{

            if(data.getBlockHit().block.typeId.includes("kkons:blobblaster")) {
                data.getBlockHit().block.setType(projectile.getDynamicProperty("kkons:blockblaster_block") as string);
            }else if (seachForNearbyGoo(data.getBlockHit().block,2) != undefined) {
                projectile.dimension.getBlock(seachForNearbyGoo(data.getBlockHit().block,2)).setType(projectile.getDynamicProperty("kkons:blockblaster_block") as string);
            }
            else {
                projectile.dimension.spawnItem(new ItemStack(projectile.getDynamicProperty("kkons:blockblaster_block") as string), projectile.location);
            }
            projectile.remove();
        })
    }
})

w.beforeEvents.chatSend.subscribe((data) => {
    const message = data.message;
    const source = data.sender;

    if(message.includes(".smooth")) {

        s.run(()=> {gooSmoothV3(source.dimension, source.location, 5);})
        message.substring(".smooth ".length)
    }
})


let tickCount = 0;
let blasterUpdateTick = 0;
let blobUpdateTick = 0;
s.runInterval(() => {

    if (blasterUpdateTick==2) {blasterUpdateTick=0;}
    blasterUpdateTick++;

    const players = w.getAllPlayers();
    players.forEach(player => {

        let playerInv = player.getComponent('minecraft:inventory') as EntityInventoryComponent;
        let playerCont = playerInv.container;
        let heldItem = playerCont.getItem(player.selectedSlotIndex) as ItemStack;
        if(heldItem?.hasTag("kkons:blaster") && blasterUpdateTick == 2) {
            //player.runCommand(`playanimation @s animation.kkons_player.blaster_heavy root 0.00001 "!query.equipped_item_any_tag('slot.weapon.mainhand', 'kkons:blaster')"`);
            player.playAnimation("animation.kkons_player.blaster_heavy", {nextState:"root", stopExpression:"!query.equipped_item_any_tag('slot.weapon.mainhand', 'kkons:blaster')"});
            if(+player.getDynamicProperty("kkons:blobblaster_charge") < 6 && player.hasTag("using_blobblaster")) {
                player.setDynamicProperty("kkons:blobblaster_charge", +player.getDynamicProperty("kkons:blobblaster_charge") + 1);
                player.runCommand(`titleraw @s actionbar {"rawtext":[{"text":"${Math.round((+player.getDynamicProperty("kkons:blobblaster_charge")/6)*100)}% charged"}]}`)
            } 
            if (player.getDynamicProperty("kkons:blobblaster_charge") == undefined) { 
                player.setDynamicProperty("kkons:blobblaster_charge", 0) 
            }

            const blockBlasterCharge = player.getDynamicProperty("kkons:blockblaster_charge") as number;

            if(+player.getDynamicProperty("kkons:blockblaster_charge") < 6 && player.hasTag("using_blockblaster")) {
                console.log(`still using blockblaster`)
                player.setDynamicProperty("kkons:blockblaster_charge", +player.getDynamicProperty("kkons:blockblaster_charge") + 1);
                player.runCommand(`titleraw @s actionbar {"rawtext":[{"text":"${Math.round((+player.getDynamicProperty("kkons:blockblaster_charge")/6)*100)}% charged"}]}`)
            } 
            if (+player.getDynamicProperty("kkons:blockblaster_charge") == undefined) { 
                player.setDynamicProperty("kkons:blockblaster_charge", 0) 
            }
        }

        //Handles blob blaster projectiles, needs moving to a function

        if (player.getTags().includes("using_blobblaster") && blasterUpdateTick == 3) {

            let durability = heldItem.getComponent(ItemComponentTypes.Durability) as ItemDurabilityComponent
            let blasterAmmo = "none"

            if (heldItem.hasTag("kkons:blaster_goo")) {
                blasterAmmo = "kkons:blobblaster_se_goo"
            } else if (heldItem.hasTag("kkons:blaster_sandy")){
                blasterAmmo = "kkons:blobblaster_se_sandy"
            }

            if ((durability.damage < durability.maxDurability || player.getGameMode() == 'creative') && blasterAmmo != "none") {

                //need to add other goo variants
                let projectile = player.dimension.spawnEntity(blasterAmmo,MathUtils.addVectors(player.location,{x:0,y:1.6,z:0}));
                player.runCommand(`playsound fall.slime @a ${player.location.x} ${player.location.y} ${player.location.z} 0.5`)
                //impulse/velocity = player aim
                projectile.applyImpulse({x:player.getViewDirection().x*2, 
                    y:player.getViewDirection().y*2+0.2, 
                    z:player.getViewDirection().z*2})

                durability.damage = durability.damage + (player.getGameMode() == 'creative' ? 0 : 1);
                playerCont.setItem(player.selectedSlotIndex, heldItem);
            }
        }
    });

    //handles blobblaster goo, need to add variants maybe run a function with variants parameters?

    //now handled with projectile hit
    //if(true==true) {
    //    w.getDimension("overworld").getEntities({families:["kkons:goo"]}).forEach(goo => {
    //        gooHandler(goo);
    //    });
    //}
},4)


const BlobBlaster = {
    onUse(event) {
        let source = event.source as Player;
        let itemstack = event.itemstack as ItemStack;
        
        //handles gun animations
        //source.runCommand(`playanimation @s animation.kkons_player.blaster_heavy root 0.001 "!query.equipped_item_any_tag('slot.weapon.mainhand', 'kkons:blaster')"`);

    }
};

/** @type {import("@minecraft/server").BlockCustomComponent} */
const GooVirus = {
    onTick(event:BlockComponentTickEvent) {
        const block = event.block;
        const dimension = event.dimension;
        const bl = block.location

        dimension.runCommand(`playsound mob.player.hurt_on_fire @a ${bl.x} ${bl.y} ${bl.z} 0.2 0.7`);
        dimension.spawnParticle('minecraft:basic_smoke_particle', bl)

        if(block.typeId == "kkons:blobblaster_block_virus") {

            dimension.runCommand(`fill ${bl.x - 1} ${bl.y - 1} ${bl.z - 1} ${bl.x + 1} ${bl.y + 1} ${bl.z + 1} kkons:blobblaster_block_virus replace kkons:blobblaster_block_goo`);
            dimension.runCommand(`fill ${bl.x - 1} ${bl.y - 1} ${bl.z - 1} ${bl.x + 1} ${bl.y + 1} ${bl.z + 1} kkons:blobblaster_block_virus replace kkons:blobblaster_block_sandy`);
            //dimension.runCommand(`particle minecraft:water_evaporation_bucket_emitter ${bl.x} ${bl.y} ${bl.z}`)
            block.setType("minecraft:air");

        } else {

            dimension.runCommand(`fill ${bl.x - 1} ${bl.y - 1} ${bl.z - 1} ${bl.x + 1} ${bl.y + 1} ${bl.z + 1} kkons:blobblaster_block_viralgoo replace kkons:blobblaster_block_sandy`);
            //dimension.runCommand(`particle minecraft:water_evaporation_bucket_emitter ${bl.x} ${bl.y} ${bl.z}`)
            block.setType("kkons:blobblaster_block_goo");
        }
    }
}

/** @type {import("@minecraft/server").BlockCustomComponent} */
const GooInteract = {
    //onPlayerInteract(event) {
    //    const block = event.block as Block;
    //    const source = event.player as Player;
    //    if(!source) {return;}
//
    //    if(source.isSneaking) {event.cancel; return;}
//
    //    const equippable = source.getComponent(EntityComponentTypes.Equippable) as EntityEquippableComponent;
    //    if (!equippable) return;
//
    //    const mainhand = equippable.getEquipmentSlot(EquipmentSlot.Mainhand);
    //    if (!mainhand.hasItem() || mainhand.typeId != "kkons:blobblaster_cell_virus") {event.cancel; return;}
    //    {
    //        block.setType("kkons:blobblaster_block_virus");
//
    //        if (source.getGameMode() != 'creative') {
    //            if (mainhand.amount > 1) {mainhand.amount--;}
    //            else {mainhand.setItem(undefined);}
    //        }
    //    }
    //}
}

/** @type {import("@minecraft/server").BlockCustomComponent} */
const GravityBlock = {
    onTick(event) {
        const block = event.block as Block;
        const dimension = event.dimension as Dimension;
        const bl = block.location;
        const bl1 = block.dimension.getBlock(bl).below(1);
        if (!(bl1?.isAir || bl1?.isLiquid || !bl1.isValid || mcArray.canReplace(bl1?.typeId))) {return;}
        
        block.setType("minecraft:air");
        let fallingEntity = dimension.spawnEntity("kkons:blobblaster_se_sandy",MathUtils.addVectors(bl,entityOffset));
        fallingEntity.setProperty("kkons:falling",true)
        fallingEntity.applyImpulse({x:0,y:-0.1,z:0});
        
    }
}



function blobBlasterShoot(player : Player) {

    let playerInv = player.getComponent('minecraft:inventory') as EntityInventoryComponent;
    let playerCont = playerInv.container;
    let heldItem = playerCont.getItem(player.selectedSlotIndex) as ItemStack;
    let durability = heldItem.getComponent(ItemComponentTypes.Durability) as ItemDurabilityComponent
    let blasterAmmo = "none"

    if (heldItem.hasTag("kkons:blaster_goo")) {
        blasterAmmo = "kkons:blobblaster_se_goo"
    } else if (heldItem.hasTag("kkons:blaster_sandy")){
        blasterAmmo = "kkons:blobblaster_se_sandy"
    }

    if ((durability.damage < durability.maxDurability || player.getGameMode() == 'creative') && blasterAmmo != "none") {

        const charge = +player.getDynamicProperty("kkons:blobblaster_charge")
        //need to add other goo variants
        let projectile = player.dimension.spawnEntity(blasterAmmo,MathUtils.addVectors(player.location,{x:0,y:1.6,z:0}));
        player.runCommand(`playsound fall.slime @a ${player.location.x} ${player.location.y} ${player.location.z} 0.5`);

        
        
        //impulse/velocity = player aim
        projectile.applyImpulse({x:player.getViewDirection().x*2, 
            y:player.getViewDirection().y*2+0.2, 
            z:player.getViewDirection().z*2});

        projectile.setDynamicProperty("kkons:goo_charge", charge+1);

        durability.damage = durability.damage + (player.getGameMode() == 'creative' ? 0 : 1);
        playerCont.setItem(player.selectedSlotIndex, heldItem);
    }
}

function gooHandler(goo : Entity) {
    let block : string = undefined;
    switch (goo.typeId) {
        case "kkons:blobblaster_se_goo":
            block = "kkons:blobblaster_block_goo";
        break;
        case "kkons:blobblaster_se_sandy":
            block = "kkons:blobblaster_block_sandy";
        break;
        default:
        break;
    }

    //prevents immediately turning solid on player
    if((+goo.getProperty("kkons:lifetime") < 10)) { goo.setProperty("kkons:lifetime", +goo.getProperty("kkons:lifetime")+1); }
    //turns goo solid when not moving
    if((Math.abs(goo.getVelocity().x)+Math.abs(goo.getVelocity().y)+Math.abs(goo.getVelocity().z) < 0.1) && +goo.getProperty("kkons:lifetime") > 1) {
        
        if(!goo.getProperty("kkons:falling") || block != "kkons:blobblaster_block_sandy") {

            //fills local area with solid "goo"
            s.runJob(createBlobSphere(goo.dimension, goo.location, block, +goo.getDynamicProperty("kkons:goo_charge")));
            goo.remove();
        } else if(mcArray.canReplace(goo.dimension.getBlock(goo.location).typeId)&&(!mcArray.canReplace(goo.dimension.getBlock(goo.location).below(1).typeId))) {
            goo.dimension.getBlock(goo.location).setType(block);
            goo.remove();
        } else if(!mcArray.canReplace(goo.dimension.getBlock(goo.location).typeId)) {
            goo.remove();
        }
    }
}

//updating to use projectile hit detection, should improve game speed 
function gooHandlerV2(goo : Entity) {
    let block : string = undefined;
    switch (goo.typeId) {
        case "kkons:blobblaster_se_goo":
            block = "kkons:blobblaster_block_goo";
        break;
        case "kkons:blobblaster_se_sandy":
            block = "kkons:blobblaster_block_sandy";
        break;
        default:
        break;
    }

    //prevents immediately turning solid on player
    {   
        if(!goo.getProperty("kkons:falling") || block != "kkons:blobblaster_block_sandy") {

            //fills local area with solid "goo"
            s.runJob(createBlobSphere(goo.dimension, goo.location, block, +goo.getDynamicProperty("kkons:goo_charge")));
            goo.remove();
        } else if(mcArray.canReplace(goo.dimension.getBlock(goo.location).typeId)&&(!mcArray.canReplace(goo.dimension.getBlock(goo.location).below(1).typeId))) {
            goo.dimension.getBlock(goo.location).setType(block);
            goo.remove();
        } else if(!mcArray.canReplace(goo.dimension.getBlock(goo.location).typeId)) {
            goo.remove();
        }
    }
}

function* createBlobSphere(dim : Dimension, loc : Vector3, material : string, size : number) {
    for (let x = -size; x < size; x++) {
        for (let y = -size; y < size; y++) {
            for (let z = -size; z < size; z++) {
                let dLoc = {x:loc.x+x, y:loc.y+y, z:loc.z+z}
                let dist = MathUtils.dist(dLoc,loc);
                if (dist <= size/2 - Math.random()/2 && (mcArray.canReplace(dim.getBlock(dLoc).typeId) || dim.getBlock(dLoc).isAir)) {
                    dim.setBlockType(dLoc, material);
                }
                yield;
            }
        }
    }
}

function gooVirus(block : Block, source : Player, mainhand) {

    if (mainhand.getItem().typeId == "kkons:blobblaster_cell_virus") {block.setType("kkons:blobblaster_block_virus");}
    else {block.setType("kkons:blobblaster_block_viralgoo");}

    if (source.getGameMode() != 'creative') {
        if (mainhand.amount > 1) {mainhand.amount--;}
        else {mainhand.setItem(undefined);}
        (source.getComponent(EntityComponentTypes.Inventory) as EntityInventoryComponent).container?.addItem(new ItemStack("kkons:blobblaster_cell_empty"));
    }
}


//experimenting with gaussian smoothing on goo blocks
////reduce dim.getBlock() calls by only accessing the block array unless needed to do otherwise
////instead of using an array, try and use a map?
////also, use a sample radius larger than the smoothing radius to try and blend better into surrounding neighbours that aren't smoothed
async function gooSmooth(dim : Dimension, origin : Vector3, r : number) {
    
    //get blocks and their locations within a radius around origin
    let blocks = [];
    let blockMap = new Map<string, { b: Block; v3: Vector3; nV3: Vector3; typeId: string; dist: number }>();

    for (let x = -r; x < r; x++) {
        for (let y = -r; y < r; y++) {
            for (let z = -r; z < r; z++) {
                let dLoc = {x:origin.x+x, y:origin.y+y, z:origin.z+z}
                let dist = MathUtils.dist(dLoc,origin);
                if (dist<=r) {
                    const block = dim.getBlock(dLoc);
                    if (block.isValid && block != undefined && !(block.isAir||block.isLiquid)) {
                        if (block.typeId.includes("kkons:blobblaster")) {
                            blocks.push({b:block,v3:block.location,nV3:block.location,typeId:block.typeId,dist:dist});
                            blockMap.set(`${dLoc.x},${dLoc.y},${dLoc.z}`, {b:block,v3:block.location,nV3:block.location,typeId:block.typeId,dist:dist})
                        }
                    }
                }
            }
        }
    }

    //for each block, calc the "weight" for gaussian smooth using neighbours
    blocks.forEach(bD => {


        //get neighbour vectors
        let v3 = bD.v3;
        let nV3 = bD.nV3;
        let sumV3 = {x:0,y:0,z:0};
        let neighbours = 0;
        for (let x = -2; x < 2; x++) {
            for (let y = -2; y < 2; y++) {
                for (let z = -2; z < 2; z++) {
                    const offset = {x:x, y:y, z:z}
                    let dV3 = MathUtils.addVectors(v3,offset); 
                    let dist = bD.dist
                    //MathUtils.dist(v3,dV3);
                    let neighbour = dim.getBlock(dV3);
                    dist*=0.75;
                    if (dist<1) dist=1;
                    {
                        if (!neighbour.isAir && !neighbour.isLiquid) {
                            if (neighbour.typeId.includes("kkons:blobblaster")) {
                            //adds the vectors
                            ///should become less prominent with distance
                            sumV3.x+=(x/dist);
                            sumV3.y+=(y/dist);
                            sumV3.z+=(z/dist);
                            neighbours++;
                            }
                        }
                    }
                }
            }
        }

        //get the weight vector3 for where to move the block
        let avgV3 : Vector3 = {x:0,y:0,z:0};
        avgV3.x = Math.round(sumV3.x/neighbours);
        avgV3.y = Math.round(sumV3.y/neighbours);
        avgV3.z = Math.round(sumV3.z/neighbours);
        
        nV3 = MathUtils.addVectors(v3,avgV3);

        bD.nV3 = nV3;
    });

    //now that each block has a weight, "push" the block to that new spot
    blocks.forEach(bD => {
        let block = bD.block as Block;
        let oldPosition : Vector3 = bD.v3;
        let newPosition : Vector3 = bD.nV3;

        if(oldPosition==newPosition) {return;}

        dim.getBlock(oldPosition).setType("minecraft:air");
    });

    blocks.forEach(bD => {
        let block = bD.block as Block;
        let oldPosition : Vector3 = bD.v3;
        let newPosition : Vector3 = bD.nV3;

        if(oldPosition==newPosition) {return;}

        dim.getBlock(newPosition).setType(bD.typeId);
    });
}

//potentially refined gaussian smooth? needs testing
function gooSmoothV2(dim: Dimension, origin: Vector3, r: number) {
    let blocks = new Map<string, { b: Block; v3: Vector3; nV3: Vector3; typeId: string; dist: number }>();

    // Collect relevant blocks
    for (let x = -r; x <= r; x++) {
        for (let y = -r; y <= r; y++) {
            for (let z = -r; z <= r; z++) {
                let dLoc = { x: origin.x + x, y: origin.y + y, z: origin.z + z };
                let dist = MathUtils.dist(dLoc, origin);
                
                if (dist <= r) {
                    const block = dim.getBlock(dLoc);
                    if (block?.isValid && !block.isAir && !block.isLiquid && block.typeId.includes("kkons:blobblaster")) {
                        blocks.set(`${dLoc.x},${dLoc.y},${dLoc.z}`, { b: block, v3: dLoc, nV3: dLoc, typeId: block.typeId, dist });
                    }
                }
            }
        }
    }

    // Compute new positions
    blocks.forEach(bD => {
        let sumV3 = { x: 0, y: 0, z: 0 };
        let neighbors = 0;

        for (let x = -2; x <= 2; x++) {
            for (let y = -2; y <= 2; y++) {
                for (let z = -2; z <= 2; z++) {
                    let offset = { x: x, y: y, z: z };
                    let dV3 = MathUtils.addVectors(bD.v3, offset);
                    let dist = bD.dist * 0.75;
                    if (dist < 1) dist = 1;

                    if (blocks.has(`${dV3.x},${dV3.y},${dV3.z}`)) {
                        sumV3.x += x / dist;
                        sumV3.y += y / dist;
                        sumV3.z += z / dist;
                        neighbors++;
                    }
                }
            }
        }

        if (neighbors > 0) {
            bD.nV3 = {
                x: Math.round(bD.v3.x + sumV3.x / neighbors),
                y: Math.round(bD.v3.y + sumV3.y / neighbors),
                z: Math.round(bD.v3.z + sumV3.z / neighbors),
            };
        }
    });

    // Move blocks efficiently
    let movedBlocks = new Map<string, string>();

    blocks.forEach(bD => {
        if (bD.v3 !== bD.nV3) {
            movedBlocks.set(`${bD.v3.x},${bD.v3.y},${bD.v3.z}`, "minecraft:air");
            movedBlocks.set(`${bD.nV3.x},${bD.nV3.y},${bD.nV3.z}`, bD.typeId);
        }
    });

    blocks.forEach(bD => {
        if (bD.v3 !== bD.nV3) {
            movedBlocks.set(`${bD.nV3.x},${bD.nV3.y},${bD.nV3.z}`, bD.typeId);
        }
    });

    movedBlocks.forEach((typeId, pos) => {
        let [x, y, z] = pos.split(",").map(Number);
        dim.getBlock({ x, y, z })?.setType(typeId);
    });
}

//applying refinements to gooSmooth
async function gooSmoothV3(dim : Dimension, o : Vector3, r : number) {

    const r2 = r+1;

    const origin = { x: Math.round(o.x), y: Math.round(o.y), z:Math.round(o.z)};
    
    //get blocks and their locations within a radius around origin
    let blocks = [];
    let blockMap = new Map<string, { b: Block; v3: Vector3; nV3: Vector3; typeId: string; dist: number }>();

    for (let x = -r; x < r; x++) {
        for (let y = -r; y < r; y++) {
            for (let z = -r; z < r; z++) {
                let dLoc = {x:origin.x+x, y:origin.y+y, z:origin.z+z}
                let dist = MathUtils.dist(dLoc,origin);
                if (dist<=r) {
                    const block = dim.getBlock(dLoc);
                    if (block.isValid && block != undefined && !(block.isAir||block.isLiquid)) {
                        if (block.typeId.includes("kkons:blobblaster")) {
                            blocks.push({b:block,v3:block.location,nV3:block.location,typeId:block.typeId,dist:dist});
                            blockMap.set(`${dLoc.x},${dLoc.y},${dLoc.z}`, {b:block,v3:block.location,nV3:block.location,typeId:block.typeId,dist:dist})
                        }
                    }
                }
            }
        }
    }

    //console.log(`found ${blockMap.size} blocks`)

    //for each block, calc the "weight" for gaussian smooth using neighbours
    blockMap.forEach(bD => {


        //get neighbour vectors
        let v3 = bD.v3;
        let nV3 = bD.nV3;
        let sumV3 = {x:0,y:0,z:0};
        let neighbours = 0;
        for (let x = -2; x < 2; x++) {
            for (let y = -2; y < 2; y++) {
                for (let z = -2; z < 2; z++) {
                    const offset = {x:x, y:y, z:z}
                    let dV3 = MathUtils.addVectors(v3,offset); 
                    let dist = bD.dist
                    //MathUtils.dist(v3,dV3);
                    //let neighbour = dim.getBlock(dV3);
                    dist*=0.75;
                    if (dist<1) dist=1;
                    if (blockMap.has(`${dV3.x},${dV3.y},${dV3.z}`)){
                        //adds the vectors
                        ///should become less prominent with distance
                        sumV3.x+=(x/dist);
                        sumV3.y+=(y/dist);
                        sumV3.z+=(z/dist);
                        neighbours++;
                        //console.log(`found block to push`)
                    }
                }
            }
        }

        //get the weight vector3 for where to move the block
        if (neighbours>0) {
            let avgV3 : Vector3 = {x:0,y:0,z:0};
            avgV3.x = Math.round(sumV3.x/neighbours);
            avgV3.y = Math.round(sumV3.y/neighbours);
            avgV3.z = Math.round(sumV3.z/neighbours);
            
            nV3 = MathUtils.addVectors(v3,avgV3);

            bD.nV3 = nV3;
        }
    });

    //now that each block has a weight, "push" the block to that new spot

    
    blockMap.forEach(bD => {
        let oldPosition : Vector3 = bD.v3;
        let newPosition : Vector3 = bD.nV3;

        if(!MathUtils.vectorsMatch(oldPosition,newPosition)) {

            dim.getBlock(oldPosition).setType("minecraft:air");
            //console.log(`modifying block at \n${JSON.stringify(oldPosition)} to \n${JSON.stringify(newPosition)}}`)
        }
    });

    blockMap.forEach(bD => {
        let oldPosition : Vector3 = bD.v3;
        let newPosition : Vector3 = bD.nV3;

        if(!MathUtils.vectorsMatch(oldPosition,newPosition) && (mcArray.canReplace(dim.getBlock(newPosition).typeId))) {

        dim.getBlock(newPosition).setType(bD.typeId);
        }
    });
}


function blockBlasterSelect(block:Block,source:Player) {
    source.setDynamicProperty("kkons:blockblaster_block",block.typeId);
    source.runCommand(`say Will now fire ${source.getDynamicProperty("kkons:blockblaster_block")}`)
}

function blockBlasterShoot(player : Player){
    let playerInv = player.getComponent('minecraft:inventory') as EntityInventoryComponent;
    let playerCont = playerInv.container;
    let heldItem = playerCont.getItem(player.selectedSlotIndex) as ItemStack;
    let durability = heldItem.getComponent(ItemComponentTypes.Durability) as ItemDurabilityComponent

    const blasterAmmo = player.getDynamicProperty("kkons:blockblaster_block") as string;

    if(searchInv("minecraft:gunpowder",playerInv).amount>0 && searchInv(blasterAmmo, playerInv).amount>0)
    {
        
        if ((player.getGameMode() == 'creative') && blasterAmmo != undefined) {
            
            const charge = +player.getDynamicProperty("kkons:blockblaster_charge");

            console.log(`firing blockblaster`);

            
            player.runCommand(`playsound fall.slime @a ${player.location.x} ${player.location.y} ${player.location.z} 0.5`);

            for (let i = 0; i < (charge*2+1); i++) {
                let projectile = player.dimension.spawnEntity("kkons:blockblaster_se_shot",player.getHeadLocation());

                projectile.applyImpulse({
                    x:player.getViewDirection().x*2+(Math.random()-0.5)*0.3, 
                    y:player.getViewDirection().y*2+(Math.random()-0.5)*0.3, 
                    z:player.getViewDirection().z*2+(Math.random()-0.5)*0.3});
    
                projectile.setDynamicProperty("kkons:block_charge", charge+1);
                projectile.setDynamicProperty("kkons:blockblaster_block", blasterAmmo as string);
            }
            //impulse/velocity = player aim
            //if (player.getGameMode() != 'creative') {
            //    if(durability.damage<durability.maxDurability) durability.damage++;
            //    else heldItem = undefined;
            //}
        }
    }
}

function seachForNearbyGoo(block : Block, r:number) {
    for (let x = -r; x < r; x++) {
        for (let y = -r; y < r; y++) {
            for (let z = -r; z < r; z++) {
                const v3 = {x:x, y:y, z:z};
                const gooCheck = MathUtils.addVectors(v3,block.location) as Vector3;
                if(block.dimension.getBlock(gooCheck).typeId.includes("kkons:blobblaster")) {
                    return gooCheck;
                }
            }
        }
    }
    return undefined;
}

function searchInv(typeId : String, inv : EntityInventoryComponent) {
    let cont = inv.container;
    for (let i = 0; i < cont.size; i++) {
        const item = cont.getItem(i);
        if (item) {
            if (typeId == item.typeId) {
                return {slot:i,amount:item.amount};
            }
        }
    }

    console.log(`could not find any ${typeId}`)
    return undefined;
}

//util
const entityOffset = {x:0.5,y:0.5,z:0.5}
const blockBelow = {x:0,y:-1,z:0}