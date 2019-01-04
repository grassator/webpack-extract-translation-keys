import { Plugin } from "webpack";

declare class ExtractTranslationKeysPlugin extends Plugin {
    constructor(options?: ExtractTranslationKeysPlugin.Options);
}

declare namespace ExtractTranslationKeysPlugin {
    interface Options {
        functionName?: string;
        done?: Function;
        output?: string | false;
        mangle?: boolean;
    }
}

export = ExtractTranslationKeysPlugin;
