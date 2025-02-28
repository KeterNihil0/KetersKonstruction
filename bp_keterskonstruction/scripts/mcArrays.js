export class mcArray {
    static canReplace(typeId) {
        if (this.replaceable.includes(typeId)) {
            return true;
        }
        else {
            return false;
        }
    }
}
mcArray.replaceable = [
    "minecraft:air",
    "minecraft:cave_air",
    "minecraft:void_air",
    "minecraft:water",
    "minecraft:flowing_water",
    "minecraft:lava",
    "minecraft:flowing_lava",
    "minecraft:short_grass",
    "minecraft:tall_grass",
    "minecraft:seagrass",
    "minecraft:tall_seagrass",
    "minecraft:fern",
    "minecraft:deadbush",
    "minecraft:fire",
    "minecraft:red_flower",
    "minecraft:yellow_flower",
    "minecraft:brown_mushroom",
    "minecraft:red_mushroom",
    "minecraft:torch",
    "minecraft:soul_torch",
    "minecraft:cobweb",
    "minecraft:vine",
    "minecraft:lily_pad",
    "minecraft:sweet_berry_bush"
];
