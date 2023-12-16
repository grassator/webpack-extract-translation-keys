import { WebpackPluginInstance, Compiler } from "webpack";

declare class ExtractTranslationKeysPlugin implements WebpackPluginInstance {
    constructor(options?: ExtractTranslationKeysPlugin.Options);
    apply: (compiler: Compiler) => void;
}

declare namespace ExtractTranslationKeysPlugin {
    interface Options {
        functionName?: string;
        done?: Function;
        output?: string | false;
        mangle?: boolean | Function;
    }
}

export = ExtractTranslationKeysPlugin;
