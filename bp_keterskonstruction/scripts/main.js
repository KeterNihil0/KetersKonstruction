import { world as w } from "@minecraft/server";
const PaletteKnife = {
    onUseOn(event) {
        const source = event.source;
        const block = event.usedOnBlockPermutation;
        let something = source.getBlockFromViewDirection({ maxDistance: 3 });
        source.runCommand(`say ${something}`);
    }
};
w.beforeEvents.worldInitialize.subscribe(({ itemComponentRegistry }) => {
    itemComponentRegistry.registerCustomComponent("kkons:paletteknife", PaletteKnife);
});
