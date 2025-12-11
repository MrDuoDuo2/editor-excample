import {InputRule} from "prosemirror-inputrules"
import { mySchema } from "./schema"
import {SyntaxRule,PluginManifest} from "./PluginManifest"
import { checkMark } from "./nodetype"
import { NodeType } from "prosemirror-model"
import { TextSelection,NodeSelection } from "prosemirror-state"

export const SyntaxRegistry = {
  // 内部状态：存储已注册的 manifests
  manifests : [] as PluginManifest[],
  
  // 注册 manifest
  register(manifest: PluginManifest) {
    this.manifests.push(manifest)
    return this  // 支持链式调用
  },
  
  // 批量注册
  registerMany(manifests: PluginManifest[]) {
    manifests.forEach(m => this.register(m))
    return this
  },

  // 获取rule对应的元素
  getNodeFromString(node: string) : NodeType {
    return mySchema.nodes[node] as NodeType
  },

  getMarkFromString(rule: SyntaxRule) : Mark[] {
    const marks = []
    for (let index = 0; index < rule.mark?.length; index++) {
      const mark = checkMark(rule.mark?.[index])
      if(mark){
        marks.push(mark)
      }
    }

    console.log(marks);
    return marks
  },
  
  // 根据已注册的 manifests 生成 InputRules
  buildInputRules(): InputRule[] {
    const rules: InputRule[] = []
    
    for (const manifest of this.manifests) {
      for (const rule of manifest.rules) {
        if (rule.type === "online_block" && rule.node) {
          rules.push(this.createBlockRule(rule))
        } else if (rule.type === "multi_line_block" && rule.node) {
          rules.push(this.createMultiLineBlockRule(rule))
        } else if (rule.type === "mark" && rule.mark) {
          rules.push(this.createMarkRule(rule))
        }
      }
    }
    
    return rules
  },
  
  // 私有方法：创建 block 规则
  createBlockRule(rule: SyntaxRule) : InputRule{
    return new InputRule(
      new RegExp(rule.trigger),
      (state, match, start, end) => {
          // 关键判断：当前光标所在的 block 必须是 paragraph
         const $pos = state.selection.$anchor
         const currentBlockType = $pos.parent.type

         // 如果不是 paragraph，直接拒绝触发
         if (currentBlockType.name !== "paragraph") {
           return null
         }

         // 先找到包含这段文本的块节点的位置
         const $start = state.doc.resolve(start)
         const blockStart = $start.start($start.depth)
         const blockEnd = $start.end($start.depth)
         
         // 删除匹配的文本，然后设置块类型
         const tr = state.tr
         tr.delete(start, end)
         
         // 使用映射来计算删除后的块位置
         const deletedLength = end - start
         const newBlockStart = blockStart
         const newBlockEnd = blockEnd - deletedLength

         const level = (match[0].match(/=/g) || []).length
         const node = this.getNodeFromString(rule.node || "")
         
         // 使用 state.schema 而不是局部创建的 mySchema
         tr.setBlockType(newBlockStart, newBlockEnd, node, { level: level })
           .scrollIntoView()

         tr.setMeta("intentional_heading", true)
         return tr
       }
    )
  },

  createMultiLineBlockRule(rule: SyntaxRule) : InputRule{
    return new InputRule(
      new RegExp(rule.trigger),
      (state, match, start, end) => {
        // 关键判断：当前光标所在的 block 必须是 paragraph
        const $pos = state.selection.$anchor
        const currentBlockType = $pos.parent.type

        // 如果不是 paragraph，直接拒绝触发
        if (currentBlockType.name !== "paragraph") {
          return null
        }

        // 先找到包含这段文本的块节点的位置
        const $start = state.doc.resolve(start)
        const blockStart = $start.start($start.depth)
        const blockEnd = $start.end($start.depth)
        
        // 删除匹配的文本，然后设置块类型
        const tr = state.tr
        tr.delete(start, end)
        
        // 使用映射来计算删除后的块位置
        const deletedLength = end - start
        const newBlockStart = blockStart
        const newBlockEnd = blockEnd - deletedLength

        const language_name = (match[1] || "")
        const node = this.getNodeFromString(rule.node || "")

        
        const codeBlock = mySchema.node("code_block", { language: language_name })
        const paragraph = mySchema.text(" ",[])

        console.log(newBlockStart, newBlockEnd)
        
        // tr.replace(newBlockStart, newBlockEnd, codeBlock)
        // 使用 state.schema 而不是局部创建的 mySchema
        tr.setBlockType(newBlockStart, newBlockEnd, node, { language: language_name })
        tr.setMeta("intentional_heading", true)
        //   .scrollIntoView()
        const selection = NodeSelection.create(tr.doc, 0)
        tr.setSelection(selection)
        // tr.insert(start + 1, state.schema.text("\n"))  // 代码块里有个空行

       
        return tr
      }
    )
  },
  
  // 私有方法：创建 mark 规则
  createMarkRule(rule: SyntaxRule): InputRule {
    return new InputRule(
      new RegExp(rule.trigger),
      (state, match, start, end) => {
        const text = match[1]
        
        // 检查 schema 中是否有 strong 和 em 标记
        const strongMark = mySchema.marks.strong
        const emMark = mySchema.marks.em
        
        if (!strongMark || !emMark) {
          return null
        }
        const marks = this.getMarkFromString(rule);
        // 创建带有 strong 和 em 标记的文本节点
        const textNode = mySchema.text(text, [
          ...marks.map(mark => mark.create())
        ])
  
        const paragraph = mySchema.text(" ",[])
  
        // 创建 transaction：删除匹配的文本，插入新节点
        const tr = state.tr
        tr.replaceWith(start, end, [textNode,paragraph])
        
        // 将光标设置到带标记文本节点的末尾，这样用户就可以继续输入普通文本
        const newPos = start + textNode.nodeSize
        tr.setSelection(TextSelection.near(tr.doc.resolve(newPos), -1))
        tr.scrollIntoView()
        
        return tr
      }
    )
    // ... 实现
    // return new InputRule()
  },
  
  // 清空注册
  clear() {
    this.manifests = []
  },
  
  // 获取已注册的 manifests
  getManifests(): PluginManifest[] {
    return [...this.manifests]  // 返回副本
  }

  
}