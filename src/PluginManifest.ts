export type SyntaxRule = {
    type: "online_block" | "multi_line_block" | "mark"
    trigger: string
    node?: string
    mark?: string[]
    getAttrs?: string | ((match: string[]) => any)
    restoreSource?: string | ((attrs: any) => string)
    autoRestoreOnEmpty?: boolean
  }
  
export type PluginManifest = {
    name: string
    rules: SyntaxRule[]
  }