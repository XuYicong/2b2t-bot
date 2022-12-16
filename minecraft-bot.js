const mineflayer = require('mineflayer')
const fs = require('fs')
const util = require('util')
const { mineflayer: mineflayerViewer } = require('prismarine-viewer')
const { time, count } = require('console')
const { Item } = require('prismarine-item')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const { Physics, PlayerState } = require('prismarine-physics')
// const Recipe = require("prismarine-recipe")("1.12.2").Recipe;
// import { GoalNear, GoalBlock, GoalInvert, GoalXZ, GoalGetToBlock } from 'mineflayer-pathfinder'.goals

// if (process.argv.length < 4 || process.argv.length > 6) {
//   console.log('Usage : node gps.js <host> <port> [<name>] [<password>]')
//   process.exit(1)
// }
const server_hostname = '2b2t.xin'
var bot
function login(){
    bot = mineflayer.createBot({
        host: server_hostname,
        //   port: parseInt(process.argv[3]),
        username: 'Xyct',
        version: '1.12.2', 
        hideErrors: false,
        auth: 'microsoft'
    })
}
login()
// console.log(bot)
function enterWorld(){
    var inventory = bot.inventory
    var compass = inventory.findInventoryItem('compass')
    // console.log('hotbar start:'+inventory.hotbarStart)
    // console.log('find compass:'+compass.customName)
    // console.log('compass slot: '+ compass.slot)
    const useCompass = (heldItem) => {
        // console.log('current quickbar slot '+ bot.quickBarSlot)
        if(heldItem == null) {
            return
        }
        console.log('helditem changed to '+ heldItem.displayName)
        bot.removeListener('heldItemChanged', useCompass)
        setTimeout(()=>{
            bot.activateItem()
            bot.deactivateItem()
        }, 500)
        setTimeout(()=>{
            var compass = inventory.findInventoryItem('compass')
            if(!isEnteredWorld()){
                queue()
            }
        }, 2500)
    }
    bot.on("heldItemChanged", useCompass)
    if(compass != null){
        setTimeout(()=>{
            bot.setQuickBarSlot(compass.slot - inventory.hotbarStart)
        }, 2000)
    }
}
function isEnteredWorld(){
    var compass = bot.inventory.findInventoryItem('compass')
    var result = compass == null || !compass.customName.includes('入')
    if(result){
        afterEnteredWorld()
    }
    return result
}
function resetPhysics(){
    var physics = bot.physics
    physics.gravity = 0.08
}
async function antiStuck(){
    // 螺旋出去
    // console.log(targetX > 0 ^ targetZ > 0)
    if(targetX > 0 ^ targetZ > 0){
        targetZ = - targetZ
    }else{
        targetX = - targetX
    }
    wander()
    // 服务器不接受我们的移动，但是重新登录会好
    // 尝试往各个方向移动
    // 尝试转动视角
    // await delay(1000)
    // var physics = bot.physics
    // // physics.gravity = 0.04
    // const world = { getBlock: (pos) => { return bot.blockAt(pos, false) } }
    // var controlState = {
    //     forward: false,
    //     back: false,
    //     left: false,
    //     right: false,
    //     jump: false,
    //     sneak: false,
    //     sprint: false,
    //     placeholder: false
    // }
    // // simulate one tick each time
    // for(var decorate of ['placeholder', 'jump', 'sneak']){
    //     controlState[decorate] = true
    //     for(var direction of ['placeholder', 'left','right',]){
    //         controlState[direction] = true
    //         for(var op of ['placeholder', 'forward', 'back',]){
    //             if(op == decorate) continue
    //             controlState[op] = true
    //             var state = new PlayerState(bot, controlState)
    //             for(var i=0; i<1; i+=1){
    //                 await delay(50)
    //                 // const yaw = bot.entity.yaw
    //                 // bot.look(yaw, 0.1)
    //                 physics.simulatePlayer(state, world).apply(bot)
    //                 // await delay(100)
    //             }
    //             controlState[op] = false
    //         }
    //         controlState[direction] = false
    //     }
    //     controlState[decorate] = false
    // }
}
function emergencyEscape(){
    bot.once('path_stop',antiStuck)
    bot.pathfinder.stop()
}

function afterEnteredWorld(){
    bot.inventory.on("updateSlot", (slot, oldItem, newItem) =>{
        const none = '没有'
        var oldItemStr, newItemStr
        if(oldItem == null) oldItemStr = none
        else oldItemStr = oldItem.count+' 个 '+oldItem.displayName
        if(newItem == null) newItemStr = none
        else newItemStr = newItem.count+' 个 '+newItem.displayName
        console.log('inventory slot '+slot+' changed from '+oldItemStr+' to '+newItemStr)
    })
    bot.on('goal_reached',()=>{
        console.log("Goal reached")
    })
    var noPathCount = 0
    bot.on("path_update", (status)=>{
        const path = status.path
        bot.viewer.drawLine(1, path)
        const s = status.status
        if(s!='partial') console.log("path_update: "+s)
        if(s.includes('noPath') || s.includes('timeout')){
            noPathCount += 1
            if(noPathCount > 5){
                if(noPathCount > 8){
                    // 想堵死我？搞笑
                    bot.chat('/suicide')
                }
                emergencyEscape()
                return
            }
            defaultMove.dontCreateFlow = false
            defaultMove.allowParkour = true
            defaultMove.maxDropDown *=2
            // console.log(bot.physics)
        }else{
            noPathCount = 0
            resetPhysics()
            if(s!='partial'){
                defaultMove.maxDropDown = 4
            }
        }
    })
    // bot.on('goal_updated',()=>{
    //     console.log("goal_updated")
    // })
    var stuckCount = 0
    bot.on("path_reset", (reason)=>{
        console.log("Path reset:"+reason)
        if(reason.includes('stuck')){
            console.log('当前坐标：'+bot.entity.position)
            stuckCount += 1
            if(stuckCount > 2){
                // bot.pathfinder.stop()
                emergencyEscape()
            }else{
                defaultMove.allowParkour = !defaultMove.allowParkour
                if(defaultMove.allowParkour){
                    defaultMove.allowFreeMotion = !defaultMove.allowFreeMotion
                }
                return
            }
        }
        if(reason.includes('place')){
            // defaultMove.allow1by1towers = !defaultMove.allow1by1towers
        }
        stuckCount = 0
    })
    bot.on('path_stop',()=>{
        console.log("path_stop")
    })
    loop()
}
function queue(){
    console.log('准备答题！')
    const answer = (message) => {
        if(isEnteredWorld()){
            bot.removeListener('messagestr', answer)
            return
        }
        // if (username === bot.username) return
        if (message.includes('A.')){
            // TODO: remember right answers
            bot.chat('A')
        }
        console.log(message)
    }
    bot.on('messagestr', answer)
}
bot.loadPlugin(pathfinder)
const collectBlockPlugin = require('mineflayer-collectblock').plugin
bot.loadPlugin(collectBlockPlugin)
const defaultMove = new Movements(bot)
defaultMove.allowSprinting = false
// pathfinder have trouble climbing
defaultMove.climbables.clear()
defaultMove.allow1by1towers = false
bot.collectBlock.movements = defaultMove
bot.pathfinder.setMovements(defaultMove)
bot.pathfinder.thinkTimeout = 10345
// bot.physics.playerHalfWidth = 0.39
bot.physics.playerSpeed = 0.1
// bot.physics.playerHeight = 1.78
bot.physics.yawSpeed = 2
bot.physics.pitchSpeed = 2
// bot.physics.gravity = 0.07
var targetX = 233333
var targetZ = -144200
const wander = ()=>{
            console.log("lets go!")
            // targetX = -targetX
            // if(targetX<0){
            //     targetZ = -targetZ
            // }
            bot.pathfinder.setGoal(new goals.GoalBlock(targetX, 130, targetZ))
        }

function delay(t){
    return new Promise(resolve => setTimeout(resolve, t))
}
async function depositAll(chest){
    for (const item of bot.inventory.items()) {
        await chest.deposit(item.type, item.metadata, item.count)
    }
}
var unavailable_block_coords = []
function isBlockAvailable(block){
    return unavailable_block_coords.findIndex((pos, index, obj) =>{
                    return pos.x == block.x &&pos.y == block.y &&pos.z == block.z
                }) == -1
}
function isAvailableEnderChest(block){
    return block.name.includes('ender_chest')
                // && !invalid_enderchest_coords.includes(block)
                && isBlockAvailable(block)
}
async function getEnderChest(callback) {
    var enderChestsCoords = bot.findBlocks({matching: (block)=>{
            return isAvailableEnderChest(block)
        }, count: 11, maxDistance: 64
    })
    for(var enderChestCoords of enderChestsCoords){
        const enderChest = bot.blockAt(enderChestCoords)
        console.log('Attempt '+ enderChest.name+' at '+enderChest.position)
        const p = enderChest.position
        var noPath = await tryGotoBlockPosition(
            bot.pathfinder.goto(new goals.GoalNear(p.x, p.y, p.z, 3)))
        if(noPath) continue

        console.log('Reached '+ enderChest.name+' at '+enderChest.position)
        var opened = false
        var result = 'Chest operation timeout'
        bot.openContainer(enderChest).then((chest)=>{
            opened = true
            result = callback(chest)
        })
        await delay(3000)
        if(!opened){
            console.log("Open chest timeout")
            unavailable_block_coords.push(enderChest.position)
            console.log(unavailable_block_coords)
            continue
        }
        return result
    }
}
async function emptyInventory(){
    var items = bot.inventory.items()
    if(items.length <= 30) return
    console.log('Emptying inventory of '+ items.length + ' items')
    await getEnderChest(depositAll)
}
async function tryGotoBlockPosition(future){
    var noPath = false
    bot.once("path_update", (status)=>{
        // console.log("path_update: "+status.status)
        if(status.status.includes('noPath')){
            noPath = true
        }
    })
    try{
        await future 
    }catch(err){
        console.log(err)
        noPath = true
    }
    return noPath
}
async function collectDroppedItems(){
    for(var id in bot.entities){
        const entity = bot.entities[id]
        // console.log(entity.getDroppedItem())
        if(entity.getDroppedItem() == null) continue
        console.log("Collecting dropped item "+ entity.displayName+' at '+entity.position)
        await tryGotoBlockPosition(bot.collectBlock.collect(entity))
    }
}
function isNatural(){
    var leaves = bot.findBlocks({
        matching: (block)=>{
            const word = 'leave'
            if(block.name.includes(word)){
                // console.log(block.name)
                return true
            }
            return false
        },
        count: 11,
        maxDistance: 64
    })
    var ender_chest = bot.findBlocks({
        matching: (block)=>{
            return isAvailableEnderChest(block)
        },
        count: 1,
        maxDistance: 64
    })
    var water = bot.findBlocks({
        matching: (block)=>{
            for(var word of ['ice', 'water']){
                if(block.name.includes(word)){
                    return true
                }
            }
        },
        count: 1,
        maxDistance: 64
    })
    // console.log(targetCoords)
    const canSettle = 
    leaves.length > 10 && 
    ender_chest.length > 0 
    && water.length > 0
    return canSettle
}
function isInDeathZone(){
    var pos = bot.entity.position
    if(Math.abs(pos.x) + Math.abs(pos.z) < 1500) return true
    return false
}
async function switchDimension(){
    // 找到并使用下界门
    await collectBlocks(['portal'], true)
    console.log("I should have reached nether portal?")
    // setTimeout(wander, 3000)
}
var escape_state = 0
async function travelViaNether(){
    const dimension = bot.game.dimension
    console.log('当前维度：'+dimension)
    // 初始在主世界死区。负责通过下界，送到主世界死区外。
    // 每次调用都需要判断当前状态，来采取对应行动
    if(dimension.includes('nether') ){
        var pos = bot.entity.position
        const mod = Math.abs(pos.x) + Math.abs(pos.z)
        if(mod > 300){
            escape_state = 1
        }
        if(mod < 120){
            escape_state = 0
        }
        if(escape_state > 0){
            await switchDimension()
        }else{
            wander()
        }
    }else{
        await switchDimension()
    }
}
function inventoryHasItem(word){
    var inventory = bot.inventory
    var item = inventory.findInventoryItem(word)
    return false
}
// 考虑怎么能不死
async function farm(){
    // 农作
    // 判断是否存在耕地
    if(inventoryHasItem('farmland')){

    }else{
        //判断是否存在锄头
        if(inventoryHasItem('hoe')){
            //锄地
        }else{
            //造锄头
        }
    }
}
var craftingTableBlock = null
async function findCraftingTableBlock(){
    if(craftingTableBlock != null) return craftingTableBlock
    // TODO: 不移动，但看一遍范围内有没有工作台。没有就算了
    craftingTableBlock = bot.findBlock({
        matching: (block)=>{
            return block.name.includes('craft')
        },
        maxDistance: 128
    })
    return craftingTableBlock
}
function countInventory(itemID){
    var count = 0
    for(var item of bot.inventory.items()){
        if(item.type == itemID) count += item.count
    }
    return count
}
// return: 任务结果
async function tryCraftItem(task, curIndex, numTargetLacking){
    if(task.count <= 0) return TASK_COMPLETED
    // for now, 默认所有crafting task都需要工作台
    // 除了工作台自身
    var craftingTable = await findCraftingTableBlock()
    if(craftingTable == null && task.target != itemIndex['crafting_table']){
        console.log('缺少工作台')
        task_stack.push(new Task(itemIndex['crafting_table'], curIndex, curIndex, 1, false))
        return TASK_IN_PROGRESS
    }
    // 此处手动控制数量，便于后续衔接熔炉等其他方式
    var available_recipes = bot.recipesFor(task.target, null, 1, craftingTable)
    function isIncrementingRecipe(recipe){
        // 判断食谱产物数量是增加的
        // 考虑到了皮革修复鞘翅
        const resultingItemId = recipe.result.id
        var productIncrements = false
        for(var recipeItem of recipe.delta){
            if(recipeItem.count > 0){
                if(recipeItem.id == resultingItemId){
                    productIncrements = true
                }
                continue
            }
            // 判断任何消耗的材料是否在usedBy树链里面。如果在，那么这个原料无法通过这个食谱获得。
            var itemUserTask = task
            var previousItemUserTask
            do{
                if(itemUserTask.target == recipeItem.id){
                    return false
                }
                previousItemUserTask = itemUserTask
                itemUserTask = task_stack[itemUserTask.usedBy]
            }while(itemUserTask != previousItemUserTask)
        }
        return productIncrements
    }
    // 先不判断了，直接试一下
    // for(const recipe of available_recipes){
    //     if(isIncrementingRecipe(recipe)){
    //         console.log(recipe)
    //         hasIncrementingRecipe = true
    //         break
    //     }
    // }
    // 如果有crafting table，就走过去
    if(craftingTable != null){
        console.log("前往工作台 at "+craftingTable.position)
        const noPath = await tryGotoBlockPosition(
            bot.pathfinder.goto(new goals.GoalLookAtBlock(
            craftingTable.position, bot.world)))
    }
    var success = false
    var requiredNumOfTargetItem = numTargetLacking
    var before
    do{
        before = requiredNumOfTargetItem
        for(const recipe of available_recipes){
            // console.log(recipe.delta)
            if(!isIncrementingRecipe(recipe)) continue
            try{
                console.log('尝试合成'+task.target)
                console.log(recipe.delta)
                // console.log(craftingTable)
                await bot.craft(recipe, 1, craftingTable)
                requiredNumOfTargetItem -= recipe.result.count
                if(requiredNumOfTargetItem <= 0){
                    console.log('crafting item '+ task.target+' 成功')
                    success = true
                    break
                }
            }catch(err){
                console.log(err)
                console.log('a recipe failed to craft')
            }
        }
        // 反复尝试所有recipe，直到再也做不了一次
    }while(before > requiredNumOfTargetItem && !success)
    // task.count = requiredNumOfTargetItem
    if(success) return TASK_COMPLETED
    if(!success){
        console.log('合成不了，先收集更多材料吧')
        const all_recipes = bot.recipesAll(task.target, null, craftingTable)
        // console.log('总菜谱数量：'+ all_recipes.length)
        for(const recipe of all_recipes){
            // console.log(recipe.delta)
            if(!isIncrementingRecipe(recipe)){
                // console.log('跳过上述菜谱')
                continue
            }
            // 把每个任务加进任务栈。
            // 因为是“或”的关系，所以父任务都是parent
            // 但菜谱之中的各项item是“且”的关系的，父任务应该是其sibling
            var sibling = curIndex
            // 浮点除法
            const timesOfCrafting = Math.ceil(requiredNumOfTargetItem / recipe.result.count)
            for(var recipeItem of recipe.delta){
                if(recipeItem.count > 0) continue
                // TODO: 暂时不考虑metadata————直到找到能测试的地方
                // 考虑背包中如果有，看数量是否足够
                // 如果不够，就减去背包中该物品的数量
                // 如果够，跳过
                var requiredNumOfItems = -recipeItem.count * timesOfCrafting
                const existingNumOfItems = bot.inventory.count(recipeItem.id)
                console.log('这个原料，需要'+requiredNumOfItems+'个，已经有'+existingNumOfItems+'个了')
                if(existingNumOfItems >= requiredNumOfItems) continue
                requiredNumOfItems -= existingNumOfItems
                console.log('New task pushed: '+requiredNumOfItems+'个'+recipeItem.id)
                const tmp = task_stack.length
                task_stack.push(new Task(recipeItem.id, sibling, curIndex, requiredNumOfItems, true))
                sibling = tmp
            }
        }
        return TASK_IN_PROGRESS
    }
    return TASK_IN_PROGRESS
}
const TASK_IN_PROGRESS = 0
const TASK_COMPLETED = 1
const TASK_FAILED = 2
async function executeOneTask(task, totalNumRequired){
    const curIndex = task_stack.length - 1
    console.log('任务序号：'+curIndex)
    // 不是背包中满足就够了的，我这是为箱子挖的
    // const numAlreadyInInventory = bot.inventory.count(task.target)
    // if(numAlreadyInInventory >= totalNumRequired){
    //     console.log('背包中物品数量已经满足要求')
    //     return TASK_COMPLETED
    // }
    // 任务执行方式：从箱子里拿
    // 任务目标不动，通过箱子来计算需要执行的数量
    // 即使任务没有完成，也不改任务目标
    // 因为下次执行会再次计算
    // TODO: 改成yield
    const withChest = await getEnderChest(balanceEnderChest)
    var numTargetLacking = await withChest(task.target, totalNumRequired)
    if(numTargetLacking <= 0){
        console.log('通过末影箱完成了任务')
        return TASK_COMPLETED
    }
    var taskHasProgress = false
    // task.type == mining
    // 检查所有可以掉落该item的block，尝试挖掘每一个
    console.log("尝试挖掘任务目标")
    // TODO: 考虑挖掘失败的情况
    // TODO: 如何判断挖掘数量？
    var before = countInventory(task.target)
    const lackingTools = await doCollectBlocks({
        matching: (block)=>{
            const drops = block.drops
            if(drops == undefined) return false
            // I'm just trying to get the ID!
            for(const drop of drops){
                if(drop.drop == undefined){
                    if(drop == task.target) return true
                    continue
                }
                const id = drop.drop.id
                if(id == undefined){
                    if(drop.drop == task.target) return true
                    continue
                }
                if(id == task.target) return true
            }
            return false
        },
        // TODO: 一个方块可能掉落多个，或概率掉落物品
        // 如燧石，红石，下界荧光块等。暂时假设每个方块稳定掉落一个
        count: numTargetLacking,
        maxDistance: 228
    })
    // console.log(lackingTools)
    for(var tool of lackingTools){
        console.log('将挖掘工具：'+tool+'加入任务')
        task_stack.push(new Task(tool, curIndex, curIndex, 2, false))
    }
    // 后面可能还有炉子等方式，暂时不考虑
    // 更新本次执行的剩余数量
    // TODO: 判断挖掘数量
    const firstEmptySlot = bot.inventory.firstEmptyInventorySlot()
    const firstItem = bot.inventory.items[0]
    bot.inventory.updateSlot(firstEmptySlot, firstItem)
    console.log('空slot数为：'+bot.inventory.emptySlotCount())
    numMined = countInventory(task.target) - before
    numTargetLacking -= numMined
    console.log('挖掘了'+numMined+'个，剩余应合成量：'+numTargetLacking)
    // TODO: 熔炉
    // TODO: 种植
    // TODO: 战斗掉落
    // TODO: 剪羊毛，装水，装岩浆，装牛奶，...
    const result = await tryCraftItem(task, curIndex, numTargetLacking)
    if(result == TASK_COMPLETED) return result
    if(taskHasProgress) return TASK_IN_PROGRESS
    return result
}
async function executeTasks(){
    while(task_stack.length > 0){
        const task = task_stack.pop()
        console.log('executing task '+ task.count +'个'+task.target)
        // TODO: 记录子任务成功情况
        task.numberOfExecution += 1
        if(task.numberOfExecution > 2){
            console.log('任务卡住，已放弃')
            continue
        }
        task_stack.push(task)
        // 执行时考虑中间的（沿parent而上直到used by）任务，和库存进行对比来计算应该执行的数量
        var totalNumRequired = task.count
        var ascendent = task_stack.at(task.parent)
        var numNonConsuming = 0
        // console.log(task_stack)
        while(task_stack[ascendent.parent] != ascendent){
            if(ascendent.target == task.target){
                // 计算时考虑每个任务是否消耗性
                // 其中所有消耗性任务的物品数量加起来
                // 加上所有非消耗性任务中物品的最大值
                if(ascendent.consuming){
                    totalNumRequired += ascendent.count
                }else if(numNonConsuming< ascendent.count){
                    numNonConsuming = ascendent.count
                }
            }
            ascendent = task_stack[ascendent.parent]
        }
        totalNumRequired += numNonConsuming
        const result = await executeOneTask(task, totalNumRequired)
        if(result == TASK_IN_PROGRESS) {
            console.log('执行获取合成原料的子任务')
            continue
        }
        if(result == TASK_FAILED) {
            console.log('任务终止')
            task_stack.pop()
            continue
        }
        // 任务完成后，再次前往末影箱进行结算
        // TODO: 等到数量更新后再问
        const withChest = await getEnderChest(balanceEnderChest)
        const numTargetLacking = await withChest(task.target, totalNumRequired)
        if(numTargetLacking > 0){
            console.log('任务完成了个屁')
            // continue
        }
        // 现在任务成功了。把父任务的后代任务全部删了。
        const targetLength = task.parent +1
        while(task_stack.length > targetLength){
            task_stack.pop()
        }
    }
}
class Task{
    constructor(target, parentIndex, usedBy, count = 1, consuming = true){
        this.target = target // itemType(number)
        this.parent = parentIndex // any element with higher index are descedents
        this.usedBy = usedBy //这个item的使用者
        this.count = count // quantity of target item
        this.numberOfExecution = 0
        this.consuming = consuming // if not consuming, check inventory for existance
    }
}
// 任务树，任何一个分支成功都算成功
// 任务栈记录任务的依赖关系
var task_stack = [] // 后来者为先到者的后代
const itemIndex = {
    'crafting_table': 58,
    'wooden_pickaxe': 270,
    'stone_pickaxe': 274,
    'stone_sword': 272,
    'stone_axe': 275,
    'bed': 355,
    'furnace': 61,
    'diamond_ore': 56,
    'redstone_ore': 73,
    'iron_ore': 15,
    'emerald_ore': 129,
    'obsidian': 49,
    'cobblestone': 4,
    'dirt': 3
}
// TODO: 任务搜索中加入best_harvet_tool，自动获取挖掘工具
const sustainItems = {
    // 排在后面的优先执行
    'bed': 1,
    'furnace': 1,
    'iron_ore': 4,
    // 'stone_pickaxe': 1,
    // TODO: auto get dirt on lacking scarffolding block
    'cobblestone': 1,
    // 'stone_axe': 1,
    'dirt': 56,
    // 'wooden_pickaxe': 1,
    // 0: 一次性用具，也就是持续用具的依赖
}
async function doBalanceEnderChest(item, numShouldInInventory, chest){
    const itemID = itemIndex[item]
    var expected = numShouldInInventory * 2
    const containerBefore = chest.containerCount(itemID)
    const inventoryBefore = chest.count(itemID)
    const existing = inventoryBefore + containerBefore
// 数背包里数量
    console.log(
        '箱子里有'+containerBefore+'个，背包里有'+inventoryBefore+'个，应该有'+numShouldInInventory+'个')
    // TODO: 假设两边的空间都总是足够
    // 若多，放进去
    if(inventoryBefore > numShouldInInventory){
        console.log('应该放进去'+(inventoryBefore - numShouldInInventory)+'个')
        await chest.deposit(itemID, null, inventoryBefore - numShouldInInventory)
    }else if (inventoryBefore < numShouldInInventory){
        // 若少，拿出来
        var numOfItemsToWithdraw = numShouldInInventory - inventoryBefore
        console.log('应该拿出来'+numOfItemsToWithdraw+'个')
        if(numOfItemsToWithdraw > containerBefore) {
            numOfItemsToWithdraw = containerBefore
            console.log('实际拿出来'+numOfItemsToWithdraw+'个')
        }
        await chest.withdraw(itemID, null, numOfItemsToWithdraw)
    }else{
        console.log('不拿也不放')
    }
    return expected - existing 
}
function balanceEnderChest(chest){
    const closure = (item, numShouldInInventory) =>{
        return doBalanceEnderChest(item, numShouldInInventory, chest)
    }
    return closure
}
async function getTasksFromEnderChest(chest){
    for(const sustainItem in sustainItems){
        // 对于每个指定物品，数总数量
        const numShouldInInventory = sustainItems[sustainItem]
        const itemID = itemIndex[sustainItem]
        // 使得背包里数量达标
        const balanceWithEnderChest = balanceEnderChest(chest)
        const numLacking = await balanceWithEnderChest(sustainItem, numShouldInInventory)
        // 缺好多，加入任务
        if(numLacking > 0){
            const parent = task_stack.length
            task_stack.push(new Task(itemID, parent, parent, numLacking))
        }
    }
}
async function getTasks(){
    // 若任务栈为空，前往末影箱重新分配材料
    // 分配后检查末影箱里缺哪些，加入任务栈
    // 材料基于inventory里该有的量，箱子里是inventory的三倍
    await getEnderChest(getTasksFromEnderChest)
}
async function sustain(){
    // 考虑自己死后，如何东山再起
    if(task_stack.length <= 0){
        await getTasks()
    }else{
        await executeTasks()
    }
}
async function develop() {
    await collectDroppedItems()
    // sustain 改名执行item获取
    // 通过其他过程来提出item获取请求
    // 如：获取挖掘工具，获取scaffolding blocks，获取农作工具，获取战斗工具
    // 各过程间优先顺序需要进一步考虑
    await sustain()
    await farm()
}
var kicked = false
async function loop(){
    console.log("HP: " + bot.health+"/20, food: "+bot.food+'/20')
    console.log("Saturation: " + bot.foodSaturation+"/5, oxygen: "+bot.oxygenLevel+'/20')
    if(kicked){
        // TODO: 手动下线
        await delay(5000)
        login()
        return
    }
    await emptyInventory()
    if(isNatural()){
        await develop()
        loop()
    }else{
        await escape()
        setTimeout(loop, 20123)
    }
}
async function escape(){
    if(isInDeathZone()){
        await travelViaNether()
    }else{
        wander()
    }
}
async function doCollectBlocks(options, goal = null){
    var targetCoords = bot.findBlocks(options)
    var blockList = []
    for(var index in targetCoords){
        const wood = bot.blockAt(targetCoords[index])
        if(wood == null) continue
        const p = wood.position
        if(p.y<2) continue
        blockList.push(wood)
        // const wood = woods[0]
    }
    var goal_reached = false
    if(goal != null){
        bot.once('goal_reached',(goal)=>{
            goal_reached = true
        })
    }
    function breakInfiniteLoop(block){
        // bot.pathfinder.stop()
        // unavailable_block_coords.push(block)
    }
    var epoch = 0
    var requiredTools = new Set()
    for(var block of blockList){
        const p = block.position
        console.log('Collecting block: '+ p + ' '+ block.name)
        if(goal != null){
            setTimeout(()=>bot.emit('routing_timeout'+epoch, block), 60123)
            bot.once('routing_timeout'+epoch, breakInfiniteLoop)
            await tryGotoBlockPosition(bot.pathfinder.goto(
                new goals.GoalBlock(p.x, p.y, p.z)))
            // await delay(3000)
            bot.removeListener('routing_timeout'+epoch, breakInfiniteLoop)
            epoch += 1
            if(goal_reached) break
        }else if(block.harvestTools != undefined){
            console.log(block.name+'的挖掘工具是:')
            var hasAnyTool = false
            for(tool in block.harvestTools){
                // console.log(tool)
                const existingNum = bot.inventory.count(tool)
                console.log(existingNum)
                if(existingNum > 1){
                    hasAnyTool = true
                    break
                }
            }
            if(!hasAnyTool){
                console.log('缺少挖掘这个方块的工具。将工具加入任务')
                for(tool in block.harvestTools){
                    requiredTools.add(tool)
                }
            }
        }
    }
    if(goal == null){
        // TODO: 任意一个方块缺挖掘工具，其他的都不挖了吗？
        if(requiredTools.size <= 0){
            await tryGotoBlockPosition(bot.collectBlock.collect(blockList))
        }
    } else if(!goal_reached){
        wander()
    }
    return requiredTools
}
async function collectBlocks(words, goal = null){
    await doCollectBlocks({
        matching: (block)=>{
            for(var index in words){
                const word = words[index]
                const p = block.position
                if(block.name.includes(word) && isBlockAvailable(block)){
                    // console.log(block.name)
                    return true
                }
            }
            return false
        },
        count: 32,
        maxDistance: 128
    }, goal)
}

bot.on('chat', (username, message) => {
    // if (username === bot.username) return
    // bot.chat(message)
    console.log(username+':'+message)
  })
bot.once('spawn', () => {
    // console.log('spawned')
    var port = 80
    if(server_hostname.includes('icu')){
        port = 8080
    }
    mineflayerViewer(bot, { port: port, firstPerson: true })
    enterWorld()
})
async function handleError(msg){
    console.log(msg)
    kicked = true
}
bot.on('kicked', handleError)
bot.on('error', handleError)