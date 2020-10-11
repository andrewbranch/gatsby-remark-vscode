declare namespace grvsc {
    namespace gql {
        interface GRVSCThemeTokenData {
            themeIdentifier: string;
            className: string;
            meta: number;
            color: string;
            bold: boolean;
            italic: boolean;
            underline: boolean;
        }
        interface GRVSCToken {
            text: string;
            startIndex: number;
            endIndex: number;
            scopes: string[];
            html: string;
            className: string;
            defaultThemeTokenData: GRVSCThemeTokenData;
            additionalThemeTokenData: GRVSCThemeTokenData[];
        }
        interface GRVSCGutterCell {
            className?: string;
            text?: string;
        }
        interface GRVSCTokenizedLine {
            tokens: GRVSCToken[];
            gutterCells?: GRVSCGutterCell[];
            text: string;
            html: string;
            attrs: any;
            className: string;
            data: any;
        }
        interface GRVSCThemeCondition {
            condition: "default" | "matchMedia" | "parentSelector";
            value?: string;
        }
        interface GRVSCTheme {
            path: string;
            identifier: string;
            conditions: GRVSCThemeCondition[];
        }
        interface GRVSCCodeBlock extends Node {
            index: number;
            html: string;
            text: string;
            preClassName: string;
            codeClassName: string;
            language?: string;
            meta?: any;
            defaultTheme: GRVSCTheme;
            additionalThemes: GRVSCTheme[];
            tokenizedLines?: GRVSCTokenizedLine[];
        }
        interface GRVSCCodeSpan extends Node {
            index: number;
            html: string;
            text: string;
            className?: string;
            language?: string;
            defaultTheme: GRVSCTheme;
            additionalThemes: GRVSCTheme[];
            tokens: GRVSCToken[];
        }
        interface GRVSCStylesheet extends Node {
            css: string;
        }
        interface GRVSCThemeArgument {
            identifier: string;
            conditions: string[];
        }
    }
}