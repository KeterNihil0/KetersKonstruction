import { Block, Player, world as w } from "@minecraft/server";

const PaletteKnife = {
    onUseOn(event) {
        const source = event.source as Player
        const block = event.usedOnBlockPermutation as Block

        let something = source.getBlockFromViewDirection({maxDistance:3})

        source.runCommand(`say ${something}`)
    }
};

w.beforeEvents.worldInitialize.subscribe(({ itemComponentRegistry }) => {
    itemComponentRegistry.registerCustomComponent("kkons:paletteknife", PaletteKnife);
});