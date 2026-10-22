---
name: 人间净土手机原型
description: 纸面般安静的个人修学界面
colors:
  primary: "#476250"
  primary-deep: "#344b3c"
  primary-soft: "#e9eee7"
  ink: "#292b25"
  muted: "#69705f"
  paper: "#fffef9"
  canvas: "#f6f5ee"
  line: "#e6e7de"
  ochre: "#986a38"
  danger: "#a1483f"
typography:
  headline:
    fontFamily: '"Songti SC", "Noto Serif SC", SimSun, serif'
    fontSize: "30px"
    fontWeight: 600
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "13px"
    lineHeight: 1.9
rounded:
  card: "16px"
  phone: "44px"
  field: "9px"
spacing:
  page-horizontal: "22px"
  card-horizontal: "18px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.paper}"
  card:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.card}"
---

# Design System: 人间净土手机原型

## Overview

**Creative North Star: "纸上的修学手册"**

这是本次原型的视觉描述，尚未作为正式品牌定稿。米白纸面、灰绿操作色和宋体标题让课程与记录保持安静、清晰；正文与控件使用系统黑体。

**Key Characteristics:**
- 内容先于装饰。
- 手机框外放预览工具，框内保持应用体验。
- 用文字和状态同时说明进度。

## Colors

### Primary
灰绿用于主按钮、已选环节、完成状态；深绿用于强调及悬停。

### Secondary
赭色用于实践及待确认状态，错误使用独立红色。

### Neutral
暖白为内容卡片，米白为应用底色，浅灰绿为外部预览背景。正文和次要说明使用两级深浅，细线分隔列表。

## Typography

首页与课程标题使用宋体；操作、正文和提示使用系统黑体。首页标题30px，课程焦点标题32px，常见正文13px，说明11–12px。课程讲义正文16px、行高2.2；计数数字53px，使用等宽数字。

## Layout

参考 fina 的393×852手机框，外框圆角44px，顶端状态区52px、底端手势区27px。手机内部独立滚动，主导航和操作栏固定在内容区之外。页面左右22px，焦点卡片左右18px。

宽屏为左侧角色／页面导航、中间手机、右侧流程说明；1080px及以下隐藏右侧，700px及以下用顶部按钮打开导航。小窗口等比缩放手机，保留完整外框。

## Elevation & Depth

应用内容主要用纸面底色和边框分层。阴影用于手机外框、底部弹层和短暂消息，列表不使用浮起阴影。

## Shapes

卡片16px圆角，表单9px圆角。念佛计数使用圆形点击区；自检题保留明确单选控件；图标使用同一组线性SVG。

## Components

### Buttons
主按钮为灰绿底暖白字，次按钮为描边，文字按钮用于轻量操作。焦点有2px轮廓，禁用态降低透明度。界面过渡约150ms，尊重减少动态效果设置。

### Cards / Containers
学习单元为纸面焦点卡，含原图路径和详情入口。已确定划分的单元用“待补资料”或“待导师设置”区分真实缺口；资料与本次要求齐备后呈现学习进度。单元内部的资料用逐项列表，不嵌套卡片。

### Inputs / Fields
使用标签、描边和纸面底色。反思为多行输入；自检为单选；错误在相关操作附近显示。

### Navigation
学员手机内底部导航切换修学、历程、我的；导师端切换学员、安排记录、我的。外部导航仅供原型评审使用。

### Practice Counter
圆形计数区呈现本次数量，计量单位按导师设置显示；累计目标另列，避免把未保存次数当作已完成。补记、撤销与保存均为明确动作。

### Curriculum Lotus
首页使用用户提供图案的五瓣结构，以青绿色、金色轮廓和中央“觉”字形成分类导航。五瓣顺时针对应正见、正人、正信、正愿、正行。使用可聚焦SVG按钮，文字保持水平；选中态加强描边并出现圆点，下方已指派的学习单元随选择切换。莲心进入所选方向下的学习单元；个人进度与记录统一收在“历程”。正见花瓣带金底“解”字标识，另四瓣带描边“行”字标识，图下同时说明理论与实践的关系。状态文字说明本门实际安排，不以花瓣完成推断整个学习阶段完成。

### Personal Learning Route
独立“历程”使用单列曲线与节点呈现实际指派单元、当前进度和学习记录。节点以深绿完成、圆点学习中、赭色待确认和空心未开始区分，同时保留状态文字。节点之间的曲线只表达时间记录，不表示固定分类解锁顺序。导师侧按选中学员呈现同样结构。

## Do's and Don'ts

### Do:
- **Do** 为状态保留可读文字。
- **Do** 保持学习内容与预览工具的位置分工。

### Don't:
- **Don't** 用纯色差代替完成与待确认的说明。
- **Don't** 把示例配色和样例文案当成已经确认的正式品牌。
