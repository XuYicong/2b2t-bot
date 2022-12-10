const mineflayer = require('mineflayer')
const fs = require('fs')
const util = require('util')
const { mineflayer: mineflayerViewer } = require('prismarine-viewer')
const { time } = require('console')
const { Item } = require('prismarine-item')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const { Physics, PlayerState } = require('prismarine-physics')
// const Recipe = require("prismarine-recipe")("1.12.2").Recipe;
// import { GoalNear, GoalBlock, GoalInvert, GoalXZ, GoalGetToBlock } from 'mineflayer-pathfinder'.goals

// if (process.argv.length < 4 || process.argv.length > 6) {
//   console.log('Usage : node gps.js <host> <port> [<name>] [<password>]')
//   process.exit(1)
// }
const password = ''
const bot = mineflayer.createBot({
  host: '2b2t.xin',
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
        }, 1000)
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
function emergencyEscape(){
    bot.once('path_stop',()=> setTimeout(()=>{
        var physics = bot.physics
        // physics.gravity = 0.04
        const world = { getBlock: (pos) => { return bot.blockAt(pos, false) } }
        const controlState = {
            forward: false,
            back: true,
            left: false,
            right: false,
            jump: true,
            sprint: false,
            sneak: false
        }
        var state = new PlayerState(bot, controlState)
        // simulate one tick each time
        for(var i=0; i<20; i+=1){
            physics.simulatePlayer(state, world).apply(bot)
        }
    },100))
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
bot.collectBlock.movements = defaultMove
bot.pathfinder.setMovements(defaultMove)
bot.pathfinder.thinkTimeout = 10345
bot.physics.playerHalfWidth = 0.39
bot.physics.playerSpeed = 0.01
bot.physics.playerHeight = 1.78
bot.physics.yawSpeed = 2
bot.physics.pitchSpeed = 2
bot.physics.gravity = 0.07
var targetX = 233333
var targetZ = -144200
const wander = ()=>{
            console.log("lets go!")
            // targetX = -targetX
            // if(targetX<0){
            //     targetZ = -targetZ
            // }
            bot.pathfinder.setGoal(new goals.GoalBlock(targetX, 100, targetZ))
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
    // console.log(targetCoords)
    return targetCoords.length > 10 && ender_chest.length > 0
}
function isInDeathZone(){
    var pos = bot.entity.position
    if(Math.abs(pos.x) + Math.abs(pos.z) < 1000) return true
    return false
}
async function switchDimension(){
    // 找到并使用下界门
    await collectBlocks(['portal'])
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
        if(mod > 400){
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
        switchDimension()
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
async function refillStonePickaxe(){
    var inventory = bot.inventory
    var stone_pickaxe = inventory.findInventoryItem('stone_pickaxe')
    if(stone_pickaxe == null){
        // 找木pickaxe
        var pickaxe = inventory.findInventoryItem('wooden_pickaxe')
    }
}
async function getTasks(){

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
const itemIndex = {
    'crafting_table': 58
}
// return: success: 任务是否成功
async function tryCraftItem(task, curIndex){
    // for now, 默认所有crafting task都需要工作台
    // 除了工作台自身
    var craftingTable = findCraftingTableBlock()
    if(craftingTable == null && task.target != itemIndex['crafting_table']){
        task_stack.push(task)
        task_stack.push(new Task(itemIndex['crafting_table'], curIndex, 1))
        return false
    }
    var recipes = bot.recipesFor(task.target, craftingTable=craftingTable)
    if(recipes.length <= 0){
        // 合成不了咯，请先收集更多材料吧
        task_stack.push(task)
        recipes = bot.recipesAll(task.target, craftingTable=craftingTableBlock)
        for(const recipe of recipes){
            // 把每个任务加进任务栈。
            // 因为是“或”的关系，所以父任务都是parent
            // 但菜谱之中的各项item是“且”的关系的，父任务应该是其sibling
            var sibling = curIndex
            // TODO: 向上取整，而不是+1
            // 我也不知道这是整数还是小数，反正先+1看看
            const times = task.count / recipe.result.count +1
            for(const recipeItem of recipe.ingredients){
                // TODO: 暂时不考虑metadata————直到找到能测试的地方
                const tmp = task_stack.length
                // TODO: 暂时不考虑背包中已有的材料。愿我们的背包够大
                task_stack.push(new Task(recipeItem.id, sibling, recipeItem.count * times))
                sibling = tmp
            }
        }
        return false
    }
    // 可以合成，let's do it
    for(const recipe of recipes){
        // TODO: 如果有crafting table，就走过去
        // 然后进行craft。依次尝试所有recipe，成功一个就break
    }
    return true
}
async function executeTasks(){
    while(task_stack.length > 0){
        const task = task_stack.pop()
        console.log('executing task '+ task.type +' '+task.target)
        task.numberOfExecution += 1
        if(task.numberOfExecution > 2){
            console.log('任务失败')
            break
        }
        const curIndex = task_stack.length
        // task.type == mining
        // TODO: 检查所有可以掉落该item的block，尝试挖掘每一个
        // 后面可能还有炉子等方式，暂时不考虑
        // TODO: 更新task的剩余数量
        const success = await tryCraftItem(task, curIndex)
        if(!success) continue
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
// 考虑自己死后，如何东山再起
async function sustain(){
    // 若任务栈为空，前往末影箱重新分配材料
    // 分配后检查末影箱里缺哪些，加入任务栈
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
    await collectBlocks([
        'wood',
        'log',
        'jungle', 'oak', 'spruce', 'birch', 'acacia', 
        // 'iron',
        'plank', 
        // 'sand', 
        // 'leaves', 
        'wool', 
        // 'flower', 'mushroom'
        // , 'stone'
        // , 'grass'
    // , 'dirt'
    ])
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
async function collectBlocks(words){
    var targetCoords = bot.findBlocks({
        matching: (block)=>{
            for(var index in words){
                const word = words[index]
                    // console.log(word+", "+block.name)
                if(block.name.includes(word)){
                    // console.log(block.name)
                    return true
                }
            }
            return false
        },
        count: 24,
        maxDistance: 128
    })
    var blockList = []
    for(var index in targetCoords){
        const wood = bot.blockAt(targetCoords[index])
        if(wood == null) continue
        const p = wood.position
        if(p.y<2) continue
        blockList.push(wood)
        // const wood = woods[0]
    }
    for(var block of blockList){
        const p = block.position
        console.log('Collecting block: '+ p + ' '+ block.name)
    }
    await tryGotoBlockPosition(bot.collectBlock.collect(blockList))
}

bot.on('chat', (username, message) => {
    if (username === bot.username) return
    // bot.chat(message)
    console.log(username+':'+message)
  })
bot.once('spawn', () => {
    // console.log('spawned')
    mineflayerViewer(bot, { port: 80, firstPerson: true })
    enterWorld()
})
bot.on('kicked', console.log)
bot.on('error', console.log)