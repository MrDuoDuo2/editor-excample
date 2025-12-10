export type SyntaxRule = {
    type: "block" | "mark"
    trigger: string
    node?: string
    mark?: string
    getAttrs?: string | ((match: string[]) => any)
    restoreSource?: string | ((attrs: any) => string)
    autoRestoreOnEmpty?: boolean
  }
  
export type PluginManifest = {
    name: string
    rules: SyntaxRule[]
  }