import { keyMap } from './keyMap'

//  快捷按键、命令处理类
export default class KeyCommand {
  //  构造函数
  constructor(opt) {
    this.opt = opt
    this.mindMap = opt.mindMap
    this.shortcutMap = {
      //Enter: [fn]
    }
    this.shortcutMapCache = {}
    this.isPause = false
    this.isInSvg = false
    this.isStopCheckInSvg = false
    this.defaultEnableCheck = this.defaultEnableCheck.bind(this)
    this.bindEvent()
  }

  // 扩展按键映射
  extendKeyMap(key, code) {
    keyMap[key] = code
  }

  // 从按键映射中删除某个键
  removeKeyMap(key) {
    if (typeof keyMap[key] !== 'undefined') {
      delete keyMap[key]
    }
  }

  //  暂停快捷键响应
  pause() {
    this.isPause = true
  }

  //  恢复快捷键响应
  recovery() {
    this.isPause = false
  }

  //  保存当前注册的快捷键数据，然后清空快捷键数据
  save() {
    // 当前已经存在缓存数据了，那么直接返回
    if (Object.keys(this.shortcutMapCache).length > 0) {
      return
    }
    this.shortcutMapCache = this.shortcutMap
    this.shortcutMap = {}
  }

  //  恢复保存的快捷键数据，然后清空缓存数据
  restore() {
    // 当前不存在缓存数据，那么直接返回
    if (Object.keys(this.shortcutMapCache).length <= 0) {
      return
    }
    this.shortcutMap = this.shortcutMapCache
    this.shortcutMapCache = {}
  }

  // 停止对鼠标是否在画布内的检查，前提是开启了enableShortcutOnlyWhenMouseInSvg选项
  // 库内部节点文本编辑、关联线文本编辑、外框文本编辑前都会暂停检查，否则无法响应回车快捷键用于结束编辑
  // 如果你新增了额外的文本编辑，也可以在编辑前调用此方法
  stopCheckInSvg() {
    const { enableShortcutOnlyWhenMouseInSvg } = this.mindMap.opt
    if (!enableShortcutOnlyWhenMouseInSvg) return
    this.isStopCheckInSvg = true
  }

  // 恢复对鼠标是否在画布内的检查
  recoveryCheckInSvg() {
    const { enableShortcutOnlyWhenMouseInSvg } = this.mindMap.opt
    if (!enableShortcutOnlyWhenMouseInSvg) return
    // 恢复检查，这里应该是 false
    this.isStopCheckInSvg = false;
  }

  //  绑定事件
  bindEvent() {
    this.onKeydown = this.onKeydown.bind(this)
    // 只有当鼠标在画布内才响应快捷键
    this.mindMap.on('svg_mouseenter', () => {
      this.isInSvg = true
    })
    this.mindMap.on('svg_mouseleave', () => {
      this.isInSvg = false
    })
    window.addEventListener('keydown', this.onKeydown)
    this.mindMap.on('beforeDestroy', () => {
      this.unBindEvent()
    })
  }

  // 解绑事件
  unBindEvent() {
    window.removeEventListener('keydown', this.onKeydown)
  }

  // ++++++++++++++++++++++++++++++++++++++
  // ++ 添加的新方法 ++
  // ++++++++++++++++++++++++++++++++++++++

/**
   * @Author: ZZJ
   * @Date: 2025-04-21
   * @Description: 通过 Ctrl+Alt+L 快捷键将选中节点的信息（ID 和文本）打印到控制台。
   */
logSelectedNodeInfo() {
  const mindMap = this.mindMap;

  if (!mindMap || !mindMap.renderer || !mindMap.renderer.activeNodeList || mindMap.renderer.activeNodeList.length === 0) {
      console.log('快捷键(Ctrl+Alt+L): 当前没有选中的节点。');
      return;
  }

  const selectedNode = mindMap.renderer.activeNodeList[0];

  // 检查实际需要的数据结构是否存在
  if (!selectedNode || !selectedNode.nodeData || !selectedNode.nodeData.data) {
      console.error('快捷键(Ctrl+Alt+L): 错误！无法访问 selectedNode.nodeData.data 结构。');
      return;
  }

  // 获取节点的 ID (uid) 和文本
  const nodeId = selectedNode.nodeData.data.uid;
  const nodeText = selectedNode.nodeData.data.text;

  // 在控制台打印信息
  console.log(`快捷键(Ctrl+Alt+L) - 选中节点信息: ID=${nodeId}, 文本=${nodeText}`);
}
  // ++++++++++++++++++++++++++++++++++++++
  // ++ 新方法添加结束 ++
  // ++++++++++++++++++++++++++++++++++++++

  // 根据事件目标判断是否响应快捷键事件
  defaultEnableCheck(e) {
    const target = e.target
    if (target === document.body) return true
    // 检查是否是允许响应快捷键的编辑元素
    for (let i = 0; i < this.mindMap.editNodeClassList.length; i++) {
      const cur = this.mindMap.editNodeClassList[i]
      if (target.classList.contains(cur)) {
        return true
      }
    }
    // 检查是否是画布容器或其子元素（排除特定编辑元素）
    if (this.mindMap.el && this.mindMap.el.contains(target)) {
        // 可以在这里添加更精细的判断，比如排除输入框等
        return true;
    }
    return false
  }

  // 按键事件
  onKeydown(e) {
    const {
      enableShortcutOnlyWhenMouseInSvg,
      beforeShortcutRun,
      customCheckEnableShortcut
    } = this.mindMap.opt
    const checkFn =
      typeof customCheckEnableShortcut === 'function'
        ? customCheckEnableShortcut
        : this.defaultEnableCheck
    // 检查是否应该响应快捷键
    if (!checkFn(e)) return
    // 检查是否暂停或鼠标不在画布内（如果开启了该选项）
    if (
      this.isPause ||
      (enableShortcutOnlyWhenMouseInSvg &&
        !this.isStopCheckInSvg &&
        !this.isInSvg)
    ) {
      return
    }
    // 遍历注册的快捷键
    Object.keys(this.shortcutMap).forEach(key => {
      if (this.checkKey(e, key)) {
        // 阻止默认行为和冒泡，但粘贴(Ctrl+V)除外，因为它需要监听原生的paste事件
        if (!this.checkKey(e, 'Control+v')) {
          e.stopPropagation()
          e.preventDefault()
        }
        // 执行快捷键前的钩子函数
        if (typeof beforeShortcutRun === 'function') {
          const isStop = beforeShortcutRun(key, [
            ...this.mindMap.renderer.activeNodeList
          ])
          if (isStop) return // 如果钩子函数返回 true，则阻止后续执行
        }
        // 执行快捷键对应的处理函数
        this.shortcutMap[key].forEach(fn => {
          fn()
        })
      }
    })
  }

  //  检查键值是否符合
  checkKey(e, key) {
    let o = this.getOriginEventCodeArr(e) // 获取事件中的按键码数组
    let k = this.getKeyCodeArr(key) // 获取快捷键字符串对应的按键码数组
    // 长度不同，肯定不匹配
    if (o.length !== k.length) {
      return false
    }
    // 逐一比较事件中的按键码是否都能在快捷键数组中找到
    for (let i = 0; i < o.length; i++) {
      let index = k.findIndex(item => {
        return item === o[i]
      })
      if (index === -1) {
        // 如果事件中的某个按键在快捷键定义中找不到，则不匹配
        return false
      } else {
        // 找到了就从快捷键数组中移除，防止重复匹配（例如 Ctrl+Ctrl）
        k.splice(index, 1)
      }
    }
    // 如果快捷键数组为空，说明所有按键都匹配上了
    return k.length === 0;
  }

  //  获取事件对象里的键值数组
  getOriginEventCodeArr(e) {
    let arr = []
    // 检查修饰键
    if (e.ctrlKey || e.metaKey) { // metaKey 通常是 Mac 的 Command 键
      arr.push(keyMap['Control'])
    }
    if (e.altKey) {
      arr.push(keyMap['Alt'])
    }
    if (e.shiftKey) {
      arr.push(keyMap['Shift'])
    }
    // 添加非修饰键的 keyCode
    // 确保不重复添加（例如按下了 Ctrl 键，e.keyCode 也是 17）
    if (!arr.includes(e.keyCode)) {
      arr.push(e.keyCode)
    }
    return arr
  }

  // 判断是否按下了组合键
  hasCombinationKey(e) {
    return e.ctrlKey || e.metaKey || e.altKey || e.shiftKey
  }

  //  获取快捷键对应的键值数组
  getKeyCodeArr(key) {
    // 使用正则表达式分割，允许 '+' 两边有空格
    let keyArr = key.split(/\s*\+\s*/)
    let arr = []
    keyArr.forEach(item => {
      // 将按键名转换为 keyCode
      if (keyMap[item] !== undefined) {
          arr.push(keyMap[item])
      } else {
          // 如果 keyMap 中没有，可能是一个未定义的键，可以考虑警告或忽略
          console.warn(`未知的快捷键名称: ${item}`);
      }
    })
    return arr
  }

  //  添加快捷键命令
  /**
   * 支持格式:
   * 'Enter'
   * 'Tab | Insert' (或关系)
   * 'Shift + a' (与关系)
   */
  addShortcut(key, fn) {
    // 支持用 | 分隔的多个快捷键绑定同一个函数
    key.split(/\s*\|\s*/).forEach(item => {
      if (this.shortcutMap[item]) {
        // 如果该快捷键已存在，则添加到数组末尾
        this.shortcutMap[item].push(fn)
      } else {
        // 如果是新的快捷键，则创建新数组
        this.shortcutMap[item] = [fn]
      }
    })
  }

  //  移除快捷键命令
  removeShortcut(key, fn) {
    // 支持用 | 分隔的多个快捷键
    key.split(/\s*\|\s*/).forEach(item => {
      if (this.shortcutMap[item]) {
        if (fn) {
          // 如果提供了函数，则只移除匹配的函数
          let index = this.shortcutMap[item].findIndex(f => {
            return f === fn
          })
          if (index !== -1) {
            this.shortcutMap[item].splice(index, 1)
            // 如果移除后数组为空，可以删除这个键
            if (this.shortcutMap[item].length === 0) {
                delete this.shortcutMap[item];
            }
          }
        } else {
          // 如果没有提供函数，则移除该快捷键的所有处理函数
          delete this.shortcutMap[item]
        }
      }
    })
  }

  //  获取指定快捷键的处理函数数组
  getShortcutFn(key) {
    let res = []
    // 支持用 | 分隔的多个快捷键查询（通常只查一个）
    key.split(/\s*\|\s*/).forEach(item => {
      res = this.shortcutMap[item] || []
    })
    return res
  }
} // 类定义结束