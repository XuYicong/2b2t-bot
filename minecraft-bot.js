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
const bot = mineflayer.createBot({
  host: server_hostname,
//   port: parseInt(process.argv[3]),
  username: 'Xyct',
  version: '1.12.2', 
  hideErrors: false,
  auth: 'microsoft'
})
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
    // 服务器不接受我们的移动，但是重新登录会好
    // 尝试往各个方向移动
    // 尝试转动视角
    targetX = - targetX
    targetZ = - targetZ
    wander()
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
    bot.on('goal_reached',()=>{
        console.log("Goal reached")
    })
    var noPathCount = 0
    bot.on("path_update", (status)=>{
        const path = status.path
        bot.viewer.drawLine(1, path)
        const s = status.status
        if(s!='partial') console.log("path_update: "+s)
        if(s.includes('noPath')){
            noPathCount += 1
            if(noPathCount > 5){
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
            defaultMove.allow1by1towers = !defaultMove.allow1by1towers
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
            bot.pathfinder.setGoal(new goals.GoalBlock(targetX, 250, targetZ))
        }

function delay(t){
    return new Promise(resolve => setTimeout(resolve, t))
}
function countItems(container, itemsList){

}
async function depositAll(chest){
    for (const item of bot.inventory.items()) {
        await chest.deposit(item.type, item.metadata, item.count)
    }
}
var invalid_enderchest_coords = []
function isAvailableEnderChest(block){
    return block.name.includes('ender_chest')
                // && !invalid_enderchest_coords.includes(block)
                && invalid_enderchest_coords.findIndex((pos, index, obj) =>{
                    return pos.x == block.x &&pos.y == block.y &&pos.z == block.z
                }) == -1
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
        bot.openContainer(enderChest).then((chest)=>{
            opened = true
            callback(chest)
        })
        await delay(3000)
        if(!opened){
            console.log("Open chest timeout")
            invalid_enderchest_coords.push(enderChest.position)
            console.log(invalid_enderchest_coords)
            continue
        }
        break
    }
}
async function emptyInventory(){
    var items = bot.inventory.items()
    if(items.length <= 10) return
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
    var targetCoords = bot.findBlocks({
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
    return targetCoords.length > 10 && ender_chest.length > 0 && water.length > 0
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
// return: 任务结果
async function tryCraftItem(task, curIndex){
    if(task.count <= 0) return TASK_COMPLETED
    // for now, 默认所有crafting task都需要工作台
    // 除了工作台自身
    var craftingTable = await findCraftingTableBlock()
    if(craftingTable == null && task.target != itemIndex['crafting_table']){
        console.log('缺少工作台')
        task_stack.push(task)
        task_stack.push(new Task(itemIndex['crafting_table'], curIndex, 1))
        return TASK_IN_PROGRESS
    }
    var recipes = bot.recipesFor(task.target, null, craftingTable)
    // 能够让产物增加的菜谱的数量
    // var hasIncrementingRecipe = false
    function isIncrementingRecipe(recipe){
        const id = recipe.result.id
        for(var item of recipe.delta){
            if(id == item.id && item.count>0) return true
        }
        return false
    }
    // for(const recipe of recipes){
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
    var left = task.count
    var before
    do{
        before = left
        for(const recipe of recipes){
            if(!isIncrementingRecipe(recipe)) continue
            try{
                console.log('尝试合成'+task.target)
                console.log(recipe.delta)
                await bot.craft(recipe, 1, craftingTable)
                left -= recipe.result.count
                if(left <= 0){
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
    }while(before > left && !success)
    task.count = left
    if(success) return TASK_COMPLETED
    if(!success){
        console.log('合成不了，先收集更多材料吧')
        task_stack.push(task)
        recipes = bot.recipesAll(task.target, null, craftingTable)
        for(const recipe of recipes){
            if(!isIncrementingRecipe(recipe)) continue
            // 把每个任务加进任务栈。
            // 因为是“或”的关系，所以父任务都是parent
            // 但菜谱之中的各项item是“且”的关系的，父任务应该是其sibling
            var sibling = curIndex
            // 浮点除法
            const times = task.count / recipe.result.count
            for(var recipeItem of recipe.delta){
                if(recipeItem.count > 0) continue
                // TODO: 暂时不考虑metadata————直到找到能测试的地方
                const tmp = task_stack.length
                // 考虑背包中如果有，看数量是否足够
                // 如果不够，就减去背包中该物品的数量
                // 如果够，跳过
                var numItems = Math.ceil(-recipeItem.count * times) 
                const existing = bot.inventory.count(recipeItem.id)
                if(existing >= numItems) continue
                numItems -= existing
                console.log('New task pushed: '+numItems+'个'+recipeItem.id)
                task_stack.push(new Task(recipeItem.id, sibling, numItems))
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
async function executeTasks(){
    while(task_stack.length > 0){
        const task = task_stack.pop()
        console.log('executing task '+ task.count +'个'+task.target)
        // TODO: 记录子任务成功情况
        task.numberOfExecution += 1
        if(task.numberOfExecution > 4){
            console.log('任务卡住，已放弃')
            continue
        }
        const curIndex = task_stack.length
        console.log('任务序号：'+curIndex)
        // task.type == mining
        // 检查所有可以掉落该item的block，尝试挖掘每一个
        console.log("检索方块中")
        // TODO: 考虑挖掘失败的情况
        // 如何判断挖掘数量？挖掘前数箱子里的个数，挖掘后再数。
        const before = bot.inventory.count(task.target)
        await doCollectBlocks({
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
            count: task.count,
            maxDistance: 228
        })
        await delay(1000)
        const after = bot.inventory.count(task.target)
        const numMined = after - before
        // 后面可能还有炉子等方式，暂时不考虑
        // 更新task的剩余数量
        task.count -= numMined
        console.log('挖掘了'+numMined+'个，剩余应合成量：'+task.count)
        const result = await tryCraftItem(task, curIndex)
        if(result == TASK_IN_PROGRESS) {
            console.log('crafting 执行子任务')
            continue
        }
        // 现在任务成功了。把父任务的后代任务全部删了。
        const targetLength = task.parent +1
        while(task_stack.length > targetLength){
            task_stack.pop()
        }
    }
}
class Task{
    constructor(target, parentIndex, count = 1){
        this.target = target // itemType(number)
        this.parent = parentIndex // any element with higher index are descedents
        this.count = count // quantity of target item
        this.numberOfExecution = 0
    }
}
// 任务树，任何一个分支成功都算成功
// 任务栈记录任务的依赖关系
var task_stack = [] // 后来者为先到者的后代
const itemIndex = {
    'crafting_table': 58,
    'wooden_pickaxe': 270,
    'stone_pickaxe': 274,
    'dirt': 3
}
// TODO: 任务搜索中加入best_harvet_tool，自动获取挖掘工具
const sustainItems = {
    // 'wooden_pickaxe': 0,
    // 0表示现在一个都没有，希望无中生有
    'stone_pickaxe': 0,
    'dirt': 32
}
async function getTasksFromEnderChest(chest){
    for(const sustainItem in sustainItems){
        // 对于每个指定物品，数总数量
        const numTaken = sustainItems[sustainItem]
        var expected = numTaken * 4
        if(expected <= 0) expected = 1
        const itemID = itemIndex[sustainItem]
        const containerBefore = chest.containerCount(itemID)
        const inventoryBefore = chest.count(itemID)
        const existing = inventoryBefore + containerBefore
        // 缺好多，加入任务
        if(existing < expected){
            task_stack.push(new Task(itemID, -1, expected - existing))
        }
        // 使得背包里数量达标
        // 数背包里数量
        console.log(
            '箱子里有'+containerBefore+'个，背包里有'+inventoryBefore+'个，应该有'+numTaken+'个')
        // TODO: 假设两边的空间都总是足够
        // 若多，放进去
        if(inventoryBefore > numTaken){
            console.log('应该放进去'+(inventoryBefore - numTaken)+'个')
            await chest.deposit(itemID, null, inventoryBefore - numTaken)
        }else if (inventoryBefore < numTaken){
            // 若少，拿出来
            console.log('应该拿出来'+(numTaken - inventoryBefore)+'个')
            await chest.withdraw(itemID, null, numTaken - inventoryBefore)
        }else{
            console.log('不拿也不放')
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
    await sustain()
    await farm()
    // await collectBlocks([
    //     'wood',
    //     'log',
    //     'jungle', 'oak', 'spruce', 'birch', 'acacia', 
    //     // 'iron',
    //     'plank', 
    //     // 'sand', 
    //     // 'leaves', 
    //     'wool', 
    //     // 'flower', 'mushroom'
    //     // , 'stone'
    //     // , 'grass'
    // // , 'dirt'
    // ])
}
async function loop(){
    console.log("HP: " + bot.health+"/20, food: "+bot.food+'/20')
    console.log("Saturation: " + bot.foodSaturation+"/5, oxygen: "+bot.oxygenLevel+'/20')
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
    for(var block of blockList){
        const p = block.position
        console.log('Collecting block: '+ p + ' '+ block.name)
        if(goal != null){
            await tryGotoBlockPosition(bot.pathfinder.goto(
                new goals.GoalBlock(p.x, p.y, p.z)))
            // await delay(3000)
            if(goal_reached) break
        }
    }
    if(goal == null){
        await tryGotoBlockPosition(bot.collectBlock.collect(blockList))
    } else if(!goal_reached){
        wander()
    }
    return blockList.length
}
async function collectBlocks(words, goal = null){
    await doCollectBlocks({
        matching: (block)=>{
            for(var index in words){
                const word = words[index]
                const p = block.position
                if(block.name.includes(word)){
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
    if (username === bot.username) return
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
bot.on('kicked', console.log)
bot.on('error', console.log)