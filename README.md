# ProseMirror 编辑器学习项目

这是一个用于学习 ProseMirror 富文本编辑器的示例项目。

## 技术栈

- **构建工具**: Vite 5.0
- **语言**: TypeScript 5.0
- **编辑器**: ProseMirror
  - prosemirror-model
  - prosemirror-state
  - prosemirror-view
  - prosemirror-schema-basic
  - prosemirror-commands
  - prosemirror-keymap
  - prosemirror-history
  - prosemirror-inputrules
  - prosemirror-transform

## 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000 查看编辑器。

### 构建生产版本

```bash
npm run build
```

### 预览构建结果

```bash
npm run preview
```

## 项目结构

```
editor-excample/
├── src/
│   └── main.ts          # 编辑器入口文件
├── index.html           # HTML 入口
├── vite.config.ts       # Vite 配置
├── tsconfig.json        # TypeScript 配置
└── package.json         # 项目依赖配置
```

## 当前功能

- ✅ 基础编辑器视图
- ✅ 撤销/重做功能 (Ctrl+Z / Ctrl+Y)
- ✅ 基础快捷键支持
- ✅ 历史记录管理

## 学习要点

### ProseMirror 核心概念

1. **Schema（模式）**: 定义文档结构和内容类型
2. **State（状态）**: 编辑器当前状态，包含文档内容和选择
3. **View（视图）**: 负责渲染和用户交互
4. **Plugins（插件）**: 扩展编辑器功能
5. **Commands（命令）**: 执行编辑操作
6. **Transform（转换）**: 文档变更操作

### 代码示例

当前实现了一个最基础的编辑器：

```typescript
import {schema} from "prosemirror-schema-basic"
import {EditorState} from "prosemirror-state"
import {EditorView} from "prosemirror-view"
import {undo, redo, history} from "prosemirror-history"
import {keymap} from "prosemirror-keymap"
import {baseKeymap} from "prosemirror-commands"

// 创建编辑器状态
let state = EditorState.create({
  schema,
  plugins: [
    history(),  // 历史记录插件
    keymap({"Mod-z": undo, "Mod-y": redo}),  // 撤销/重做快捷键
    keymap(baseKeymap)  // 基础快捷键
  ]
})

// 创建编辑器视图
let view = new EditorView(document.body, {
  state
})
```

## 学习路径建议

1. **基础阶段**
   - 理解 Schema、State、View 的关系
   - 学习如何创建和更新编辑器状态
   - 掌握基本的命令和快捷键

2. **进阶阶段**
   - 自定义 Schema
   - 创建自定义插件
   - 实现自定义命令
   - 处理复杂的选择和转换

3. **高级阶段**
   - 实现协作编辑
   - 自定义节点视图
   - 性能优化
   - 集成其他富文本功能

## 参考资源

- [ProseMirror 官方文档](https://prosemirror.net/docs/)
- [ProseMirror 指南](https://prosemirror.net/docs/guide/)
- [ProseMirror API 文档](https://prosemirror.net/docs/ref/)

## 注意事项

⚠️ 这是一个学习项目，代码结构较为简单，适合初学者理解 ProseMirror 的基本概念和使用方法。

## License

ISC

