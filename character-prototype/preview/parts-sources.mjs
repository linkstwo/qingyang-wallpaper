export const sources={main:'../../references/originals/main-reading-v2.png',side:'../../references/originals/side-reference.png',back:'../../references/originals/back-reference.png',sideB:'../../references/derived/side-b-shoulder-back.png'};
export const regions={sideB:{arm:[.02,.20,.80,.76],shoulder:[.02,.01,.85,.39],torso:[.40,.24,.58,.73]},main:{arm:[.68,.28,.32,.70],shoulder:[.43,.22,.49,.30],torso:[.39,.37,.47,.36]},side:{arm:[.22,.35,.67,.35],shoulder:[.24,.20,.46,.25],torso:[.19,.29,.49,.42]},back:{arm:[.38,.32,.56,.37],shoulder:[.15,.17,.52,.30],torso:[.17,.32,.49,.42]}};
export const expectedSourceHashes={sideB:'75d3831e06d808247e386b8dfbdec5dcad190225c66c51bb47bbab8be5a56e56'};

// Two patches from one donor view; independent authoring, not new camera angles.
sources.sideBNape='../../references/derived/side-b-nape-shoulder.png';
expectedSourceHashes.sideBNape='cc21d3541f50fb452dc0daa9abbbedd5b47e16e47650fb3a31531291b6e83d7e';
regions.sideBNape={arm:[.02,.02,.96,.96],shoulder:[.02,.02,.96,.96],torso:[.02,.02,.96,.96]};
sources.sideBUpperArm='../../references/derived/side-b-upper-arm.png';
expectedSourceHashes.sideBUpperArm='63bde24e89142a2ff67a0bb7b743040b29bd87b6ae9e6fecdd42552e835cf014';
regions.sideBUpperArm={arm:[.02,.02,.96,.96],shoulder:[.02,.02,.96,.96],torso:[.02,.02,.96,.96]};

sources.sideBNapeCutout='../../references/derived/side-b-nape-shoulder-cutout.png';
expectedSourceHashes.sideBNapeCutout='93dd07941d15f80fb0acc24ed4a541bebe06dbb57e03bb49536b072b824b9548';
regions.sideBNapeCutout={arm:[.02,.02,.96,.96],shoulder:[.02,.02,.96,.96],torso:[.02,.02,.96,.96]};

sources.sideBUpperArmCutout='../../references/derived/side-b-upper-arm-cutout.png';
expectedSourceHashes.sideBUpperArmCutout='0542f125803496833627a3817999906f7b3c0b3a8f190f0f807662152e3b3f59';
regions.sideBUpperArmCutout={arm:[.02,.02,.96,.96],shoulder:[.02,.02,.96,.96],torso:[.02,.02,.96,.96]};
