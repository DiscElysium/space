extends Node
## An optional showcase layer over the unmodified v0.14 pack.
## Its saves and infinite source metadata never use the normal voyage paths.
const UI=preload("res://scripts/ui/interface_theme.gd")
const IDS=["arc","loom","blank"]
const NAMES=["ARC · 全产业链综合舰","LOOM · 纵贯主干线舰","BLANK · 空白实验台"]
const DESCRIPTIONS=[
	"集中仓储。三种原料经过共同物流网，连接两种熔炉、钢材分配、弹药、科研、建造储备及整船动力维修。",
	"纵贯布局。原料从后部进入，沿主干线送往制造和科研，再向船首武器及全舰动力分配。功能完整，结构不同。",
	"九块空甲板。材料与设备无限、科技解锁，可以从零设计自己的飞船。"
]
var game
var workshop
var canonical_catalogue

static func restore_exported_capabilities() -> Catalog:
	# v0.14's exported Resource binaries lost this PackedStringArray field.
	# Restore the exact source catalogue declarations before any model is built.
	var canonical={
		"belt":["transport"],"laser":["mine","export"],"thruster":["thrust","receive"],
		"splitter":["receive","export","split"],"activator":["control"],
		"furnace":["receive","process","export"],"storage":["receive","export"],
		"fuel_laser":["mine","receive","export"],"heavy_thruster":["thrust","receive"],
		"fast_furnace":["receive","process","export"],"bridge":["bridge","receive","export"],
		"crafting_bench":["receive","process","export"],"machine_gun":["receive","weapon"],
		"laboratory":["receive","process"],"unloader":["dock"],"repairer":["repair","receive"]
	}
	var catalogue=Catalog.new()
	for id in catalogue.ids:catalogue.buildings[id].capabilities=PackedStringArray(canonical[str(id)])
	return catalogue

class InfiniteBackpack extends BackpackState:
	const STOCK=1000000.0
	func quantity(item: StringName) -> float:return STOCK if items.has(item) else 0.0
	func add(item: StringName,count: float) -> void:
		if count>0:items[item]=STOCK
		changed.emit()
	func take(item: StringName,count: float) -> bool:return count>=0 and items.has(item)
	func restore(data: Dictionary) -> void:
		harvested=data.get("harvested",{}).duplicate();changed.emit()

class Designer extends RefCounted:
	var model=FleetModel.new()
	var sources: Dictionary={}
	var modules: Array=[]
	var errors: Array=[]
	var deck_roles: Dictionary={}
	func unlock() -> void:
		model.research_catalog.ensure_deck_tiers(256)
		for id in model.research_catalog.ids:model.research.completed[id]=true
		model.research.red_points=1000000;model.refresh_definitions()
	func add(kind: StringName,at: Vector2i,direction: int=0,key: int=0,source: StringName=&"") -> MachineState:
		var m=model.create(kind,at,direction)
		if m==null:
			errors.append(str(kind)+" @ "+str(at));return null
		if key>0:m.keycode=key;m.normally_on=false
		if model.get_definition(kind).has_capability("export"):m.output_filters={"0":"","1":"","2":"","3":""}
		if not source.is_empty():StorageSlots.insert(m,source,400);sources[str(m.id)]=str(source)
		return m
	func output(m: MachineState,side: int) -> MachineState:
		if m!=null:m.output_filters[str(side)]="*"
		return m

class Router extends RefCounted:
	var owner_ref
	var designer:
		get:return owner_ref.get_ref()
	var routes=[]
	var reserved={}
	func _init(value):owner_ref=weakref(value)
	func reserve_ports() -> void:
		reserved.clear()
		for m: MachineState in designer.model.machines.values():
			var def=designer.model.get_definition(m.kind)
			if def.has_capability("receive") or def.has_capability("export"):
				for port in ports(m):reserved[port.p]=true;reserved[port.stub]=true
	func ports(m: MachineState,sides: Array=[]) -> Array:
		var result=[];var bounds=designer.model.rect(m)
		for side in range(4):
			if not sides.is_empty() and not sides.has(side):continue
			var count=bounds.size.y if side%2==0 else bounds.size.x
			for i in range(count):
				var p=bounds.position
				match side:
					0:p+=Vector2i(bounds.size.x,i)
					1:p+=Vector2i(i,bounds.size.y)
					2:p+=Vector2i(-1,i)
					3:p+=Vector2i(i,-1)
				var stub=p+Vector2i(BeltGeometry.DIRS[side])
				if designer.model.ship_contains(p) and designer.model.at(p)==null and designer.model.ship_contains(stub) and designer.model.at(stub)==null:result.append({"p":p,"stub":stub,"side":side})
		return result
	func key(p: Vector2i,direction: int,cool: int) -> String:return "%d,%d,%d,%d"%[p.x,p.y,direction,cool]
	func route(source: MachineState,target: MachineState,item: StringName,label: String,source_sides: Array=[],target_sides: Array=[]) -> bool:
		var starts=ports(source,source_sides);var goals=ports(target,target_sides);var goal_map={}
		var allowed={}
		for port in starts+goals:allowed[port.p]=true
		for goal in goals:goal_map[goal.stub]=goal
		if starts.is_empty() or goals.is_empty():designer.errors.append("No free port: "+label);return false
		var center=designer.model.center(target)/32
		var estimate=func(p):return absf(p.x-center.x)+absf(p.y-center.y)
		var open=[];var states={};var best={};var closed={};var finish=""
		for start in starts:
			var k=key(start.stub,start.side,0);var row={"p":start.stub,"port":start.p,"origin":start.stub,"dir":start.side,"cool":0,"g":0.,"f":estimate.call(start.stub),"prev":"","jump":false,"side":start.side,"key":k}
			states[k]=row;best[k]=0.;open.append(row)
		var attempts=0
		while not open.is_empty() and attempts<40000:
			attempts+=1;open.sort_custom(func(a,b):return a.f>b.f)
			var row=open.pop_back();var p: Vector2i=row.p
			if closed.has(row.key):continue
			closed[row.key]=true
			if goal_map.has(p):finish=row.key;break
			for direction in range(4):
				if row.cool==2 and direction!=row.dir:continue
				var step: Vector2i=BeltGeometry.DIRS[direction];var at=p+step;var span=1;var jump=false
				if not designer.model.ship_contains(at):continue
				if designer.model.at(at)!=null or (reserved.has(at) and not goal_map.has(at) and at!=row.origin):
					if row.dir!=direction or row.cool>0:continue
					for length in range(2,13):
						var candidate=p+step*length
						if designer.model.ship_contains(candidate) and designer.model.at(candidate)==null and (not reserved.has(candidate) or goal_map.has(candidate) or candidate==row.origin):
							at=candidate;span=length;jump=true;break
					if not jump:continue
					if goal_map.has(at) and direction!=(int(goal_map[at].side)+2)%4:continue
				var cool=2 if jump else maxi(0,int(row.cool)-1)
				var ancestor=row.key;var repeats=false
				while not ancestor.is_empty():
					if states[ancestor].p==at:repeats=true;break
					ancestor=states[ancestor].prev
				if repeats:continue
				var k=key(at,direction,cool);var cost=float(row.g)+span+(4. if jump else 0.)
				if closed.has(k) or cost>=float(best.get(k,INF)):continue
				var next={"p":at,"port":row.port,"origin":row.origin,"dir":direction,"cool":cool,"g":cost,"f":cost+estimate.call(at),"prev":row.key,"jump":jump,"side":row.side,"key":k}
				states[k]=next;best[k]=cost;open.append(next)
		if finish.is_empty():designer.errors.append("Unrouted: "+label+" attempts="+str(attempts));return false
		var path=[];var k=finish
		while not k.is_empty():path.push_front(states[k]);k=states[k].prev
		var goal=goal_map[path.back().p]
		path.push_front({"p":path[0].port,"dir":path[0].side,"side":path[0].side,"jump":false})
		path.append({"p":goal.p,"dir":(int(goal.side)+2)%4,"side":path[0].side,"jump":false})
		var planned={};var pairs=[]
		for i in range(path.size()):
			var row=path[i];var out=(int(goal.side)+2)%4 if i==path.size()-1 else int(path[i+1].dir)
			planned[row.p]={"kind":&"belt","dir":out}
		for i in range(1,path.size()):
			if path[i].jump:
				planned[path[i-1].p]={"kind":&"bridge","dir":path[i].dir}
				planned[path[i].p]={"kind":&"bridge","dir":path[i].dir}
				pairs.append([path[i-1].p,path[i].p])
		var built={}
		for p: Vector2i in planned:built[p]=designer.add(planned[p].kind,p,planned[p].dir)
		for pair in pairs:
			var a: MachineState=built[pair[0]];var b: MachineState=built[pair[1]]
			if a==null or b==null:return false
			a.bridge_source=true;b.bridge_source=false;a.bridge_peer=b.id;b.bridge_peer=a.id
			designer.output(b,b.direction)
		source.output_filters[str(path[0].side)]=str(item)
		routes.append({"label":label,"source":source.id,"target":target.id,"item":str(item),"cells":path.size(),"bridge_pairs":pairs.size()})
		return true

class IntegratedDesigner extends Designer:
	var named: Dictionary={}
	var router
	func node(id: String,kind: StringName,at: Vector2i,direction: int=0,key: int=0,source: StringName=&"") -> MachineState:
		var m=add(kind,at,direction,key,source);named[id]=m;return m
	func link(a: String,b: String,item: StringName,label: String,multiple: int=1,source_sides: Array=[]) -> void:
		if named.get(a)==null or named.get(b)==null:errors.append("Missing node: "+a+" -> "+b);return
		for i in range(multiple):router.route(named[a],named[b],item,label,source_sides)
	func make(id: String) -> Dictionary:
		unlock()
		var cells: Array[Vector2i]=[Vector2i.ZERO]
		for y in range(-3,4):
			for x in range(-2,3):
				if x==0 and y==0:continue
				var valid=absi(x)<=1 and absi(y)<=1 if id=="blank" else ((absi(x)<=1 or y==0) if id=="loom" else ((absi(y)<=2 and absi(x)+absi(y)<=3) or (x==0 and absi(y)==3)))
				if valid:cells.append(Vector2i(x,y))
		for cell: Vector2i in cells:model.floors.append(FloorDefinition.new(model.floors.size()+1,cell))
		model.core_floor_id=1;model.rebuild();router=Router.new(self)
		if id=="blank":return {"model":model,"sources":sources,"modules":[],"routes":[],"named":named,"errors":errors}
		var positions={"iron":Vector2i(-8,0),"oil":Vector2i(2,0),"red":Vector2i(12,0),"furnace":Vector2i(-8,-9),"fast":Vector2i(2,-12),"steel":Vector2i(-5,-5),"split":Vector2i(1,-4),"bench":Vector2i(-11,10),"ammo":Vector2i(-5,13),"lab":Vector2i(11,10)}
		if id=="loom":positions={"iron":Vector2i(-8,15),"oil":Vector2i(2,15),"red":Vector2i(12,15),"furnace":Vector2i(-8,-7),"fast":Vector2i(8,-7),"steel":Vector2i(1,3),"split":Vector2i(6,3),"bench":Vector2i(-7,-13),"ammo":Vector2i(0,-12),"lab":Vector2i(10,-12)}
		for data in [["iron",&"storage",&"iron_ore"],["oil",&"storage",&"oil"],["red",&"storage",&"redstone"]]:node(data[0],data[1],positions[data[0]],0,0,data[2])
		for data in [["furnace",&"furnace"],["fast",&"fast_furnace"],["steel",&"storage"],["split",&"splitter"],["bench",&"crafting_bench"],["ammo",&"storage"],["lab",&"laboratory"]]:node(data[0],data[1],positions[data[0]])
		node("fore_fuel",&"storage",Vector2i(3,-17));StorageSlots.insert(named.fore_fuel,&"oil",120)
		node("ore_sorter",&"storage",Vector2i(7,-21))
		if id=="arc":node("return_iron",&"storage",Vector2i(-3,-18))
		node("aft_fuel",&"storage",Vector2i(4,29));StorageSlots.insert(named.aft_fuel,&"oil",400)
		node("reserve",&"storage",Vector2i(-19,0));node("dock",&"unloader",Vector2i(-20,0),2)
		node("gun",&"machine_gun",Vector2i(4,-25));named.gun.inventory[&"ammo"]=5.
		node("gun_key",&"activator",Vector2i(3,-25),0,KEY_SPACE)
		node("laser",&"laser",Vector2i(-8,-18),3);node("laser_key",&"activator",Vector2i(-9,-17),0,KEY_F)
		node("fuel_laser",&"fuel_laser",Vector2i(17,-18),3);named.fuel_laser.fuel_stock=5.
		node("fuel_laser_key",&"activator",Vector2i(16,-15),0,KEY_F)
		for data in [["w_left",&"thruster",-6,25,3],["w_right",&"thruster",14,25,3],["s_left",&"thruster",-6,-18,1],["s_right",&"thruster",14,-18,1],["d",&"thruster",-18,4,0],["a",&"thruster",25,4,2],["main",&"heavy_thruster",4,35,3]]:
			var m=node(data[0],data[1],Vector2i(data[2],data[3]),data[4]);m.set_oil(model.get_definition(m.kind).capacity)
		for data in [[-7,26,0,KEY_W],[-4,26,2,KEY_E],[13,26,0,KEY_W],[16,26,2,KEY_Q],[-7,-17,0,KEY_S],[-4,-17,2,KEY_Q],[16,-17,2,KEY_S],[13,-17,0,KEY_E],[-19,4,0,KEY_D],[28,4,2,KEY_A],[3,36,0,KEY_W]]:add(&"activator",Vector2i(data[0],data[1]),data[2],data[3])
		# Three distinct repair zones protect the processing, fabrication and drive bays.
		var repair_index=3
		for i in range(3):node("repair_"+str(i),&"repairer",[Vector2i(-1,-10),Vector2i(0,11),Vector2i(4,24)][i])
		router.reserve_ports()
		# Route the backbone before adding short consumers. Bridges cross existing
		# lines without mixing cargo; all outlets use native item filters.
		link("oil","aft_fuel",&"oil","双路燃油主干",2)
		link("aft_fuel","main",&"oil","重推双路供油",2)
		link("oil","fore_fuel",&"oil","前部燃油支干")
		for name in ["w_left","w_right"]:link("aft_fuel",name,&"oil","尾部机动供油")
		for name in ["s_left","s_right"]:link("fore_fuel",name,&"oil","反推供油")
		for name in ["a","d"]:link("oil",name,&"oil","横向机动供油")
		for name in ["furnace","fast"]:
			link("iron",name,&"iron_ore","铁矿熔炼进料")
			link("fore_fuel",name,&"oil","熔炼燃料")
			link(name,"steel",&"steel","钢材汇流")
		link("steel","split",&"steel","钢材总线分配")
		link("split","bench",&"steel","钢材制弹")
		link("split","lab",&"steel","科研钢材")
		link("split","reserve",&"steel","设备建造储备")
		link("red","lab",&"redstone","红石科研")
		link("bench","ammo",&"ammo","弹药成品缓存")
		link("ammo","gun",&"ammo","舰艏机炮供弹")
		link("fore_fuel","fuel_laser",&"oil","燃油光束供油")
		# Iron distribution buffers keep repair traffic off the steel production line.
		for i in range(repair_index):link("iron","repair_"+str(i),&"iron_ore","分区维修供料")
		if id=="arc":
			link("ore_sorter","return_iron",&"iron_ore","采集铁矿回收缓冲",1,[3])
			link("return_iron","iron",&"iron_ore","采集铁矿分类归仓")
		else:link("ore_sorter","iron",&"iron_ore","采集铁矿分类归仓",1,[2])
		link("ore_sorter","red",&"redstone","采集红石分类归仓",1,[0])
		link("ore_sorter","oil",&"oil","采集石油分类归仓",1,[1])
		for laser in ["laser","fuel_laser"]:router.route(named[laser],named.ore_sorter,&"*","混合采矿汇流")
		model.initial_oil=model.stored_oil();model.rebuild()
		modules=router.routes
		return {"model":model,"sources":sources,"modules":modules,"routes":router.routes,"named":named,"errors":errors}

class Workshop extends Node:
	var game
	var presets_script
	var current="vector"
	var sources: Dictionary={}
	var source_on=true
	var supply_clock=0.0
	var save_clock=0.0
	var mineral_clock=0.0
	var picker: OptionButton
	var supply_picker: OptionButton
	var description: Label
	var info: Label
	var source_check: CheckButton
	var reset_dialog: ConfirmationDialog
	var stats: Dictionary={}
	var asset_dir=""
	var named_ids: Dictionary={}
	var switching=false
	var save_prefix="space-integrated-creative-r1-"
	func path_for(id: String) -> String:return "user://"+save_prefix+id+".json"
	func meta_path(id: String) -> String:return "user://"+save_prefix+id+"-sources.json"
	func install_infinite_bag() -> void:
		var bag=InfiniteBackpack.new()
		for item in game.model.catalog.items:bag.items[item]=InfiniteBackpack.STOCK
		bag.harvested=game.profile.backpack.harvested.duplicate()
		game.profile.backpack=bag;game.ship_editor.backpack=bag;game.ground.editor.backpack=bag
		game.profile.tutorial.active=false;game.tutorial.dismiss()
	func refill() -> void:
		if not source_on:return
		for raw in sources.keys():
			var m=game.model.machines.get(int(raw))
			if m==null or m.kind!=&"storage":sources.erase(raw);continue
			if not game.model.supported(m):continue
			StorageSlots.insert(m,StringName(sources[raw]),400)
	func renew_deposits() -> void:
		for deposit: Dictionary in game.world.deposits.values():deposit.amount=999999999.0
	func save_current() -> bool:
		if switching:return false
		game.save_path=path_for(current)
		var result=game.save_game(false)
		if result:
			var f=FileAccess.open(meta_path(current),FileAccess.WRITE)
			if f!=null:f.store_string(JSON.stringify({"sources":sources,"enabled":source_on,"named":named_ids}))
		return result
	func load_preset(id: String,reset: bool=false) -> void:
		if switching:return
		if is_instance_valid(game) and not current.is_empty():save_current()
		switching=true
		current=id;game.save_path=path_for(id)
		var state={} if reset else SaveService.read(game.save_path)
		var designer=IntegratedDesigner.new()
		if state.is_empty():
			var design
			var layout_path=asset_dir.path_join("presets/"+id+".json")
			if FileAccess.file_exists(layout_path):
				var layout=JSON.parse_string(FileAccess.get_file_as_string(layout_path))
				design={"model":StateCodec.decode(layout.fleet),"sources":layout.sources,"errors":layout.errors};named_ids=layout.named.duplicate()
			else:
				design=designer.make(id);named_ids.clear()
				for name in design.named:if design.named[name]!=null:named_ids[name]=design.named[name].id
			assert(design.errors.is_empty(),"Invalid showcase layout "+str(design.errors))
			var data=game._capture_map();data.fleet=StateCodec.encode(design.model)
			var profile=WorkshopProfile.new();profile.tutorial.active=false;profile.tutorial.chapter="voyage"
			data.profile=profile.to_data();data.pose=[0.,0.,0.,0.,0.,0.];data.mode=0;data.paused=false
			state=SaveService.decode(data);sources=design.sources.duplicate();source_on=true
		else:
			sources.clear()
			if FileAccess.file_exists(meta_path(id)):
				var meta=JSON.parse_string(FileAccess.get_file_as_string(meta_path(id)))
				if meta is Dictionary:sources=meta.get("sources",{});source_on=bool(meta.get("enabled",true));named_ids=meta.get("named",{})
		assert(not state.is_empty(),"Showcase state failed validation")
		game._apply_state(state);install_infinite_bag();refill();renew_deposits()
		game._ensure_start_clearance();game.center_camera()
		game.hud.close_overlays();game.hud.catalog_view.refresh();game.hud.refresh_inspector()
		game.save_timer=-100000;switching=false
		update_info();save_current()
		game.hud.show_message("独立综合工坊 · "+NAMES[IDS.find(current)])
	func build_menu() -> void:
		var ui=game.hud
		for child in ui.content(ui.menu_panel).get_children():child.queue_free()
		var box=VBoxContainer.new();box.add_theme_constant_override("separation",9);ui.content(ui.menu_panel).add_child(box)
		var title=HBoxContainer.new();box.add_child(title)
		ui.label(title,"CREATIVE WORKSHOP  /  创意工坊 ∞",19,UI.GOLD).size_flags_horizontal=Control.SIZE_EXPAND_FILL
		ui.button(title,"×",ui.close_overlays)
		picker=OptionButton.new();picker.focus_mode=Control.FOCUS_NONE;picker.custom_minimum_size.y=40
		for name in NAMES:picker.add_item(name)
		box.add_child(picker);picker.item_selected.connect(func(i):description.text=DESCRIPTIONS[i])
		description=ui.label(box,DESCRIPTIONS[0],14,UI.MUTED);description.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART;description.custom_minimum_size=Vector2(600,48)
		var actions=HBoxContainer.new();actions.add_theme_constant_override("separation",8);box.add_child(actions)
		ui.button(actions,"载入 / 继续这艘飞船",func():load_preset(IDS[picker.selected]));ui.button(actions,"恢复原始预设…",func():reset_dialog.popup_centered())
		ui.button(actions,"保存当前设计",func():save_current();ui.show_message("创意工坊设计已保存"))
		info=ui.label(box,"",14,UI.JADE)
		source_check=CheckButton.new();source_check.text="无限原料源 · 补给柜持续补满，产线仍需真实运输";source_check.button_pressed=true;source_check.focus_mode=Control.FOCUS_NONE;box.add_child(source_check)
		source_check.toggled.connect(func(value):source_on=value;save_current())
		var supply_row=HBoxContainer.new();supply_row.add_theme_constant_override("separation",8);box.add_child(supply_row)
		supply_picker=OptionButton.new();supply_picker.focus_mode=Control.FOCUS_NONE
		for item in [&"oil",&"iron_ore",&"steel",&"ammo",&"redstone"]:supply_picker.add_item(InventoryPresentation.title(game.model.catalog,item));supply_picker.set_item_metadata(supply_picker.item_count-1,str(item))
		supply_row.add_child(supply_picker)
		ui.button(supply_row,"选中储存柜设为补给源",mark_source)
		ui.button(supply_row,"取消选中柜的补给",unmark_source)
		var view_row=HBoxContainer.new();view_row.add_theme_constant_override("separation",8);box.add_child(view_row)
		ui.button(view_row,"航行 / 全舰视图",func():ui.close_overlays();game.set_mode(0);game.center_camera())
		ui.button(view_row,"2D 建造",func():ui.close_overlays();game.set_mode(2);game.atelier.choose_flat(true))
		ui.button(view_row,"3D 建造",func():ui.close_overlays();game.set_mode(2);game.atelier.choose_flat(false))
		ui.button(view_row,"定位建造储备",func():ui.close_overlays();game.inspect_machine({"surface":"ship","machine":int(named_ids.get("reserve",-1))}))
		ui.button(view_row,"开放选中柜出口",func():
			var m=selected_storage()
			if m!=null:m.output_filters.clear();save_current();ui.show_message("已开放该储存柜的全部出口"))
		ui.label(box,"WASD 平移  ·  Q/E 转向  ·  Space 机炮瞄准鼠标  ·  F 采矿光束\nB 背包与放置  ·  R 旋转  ·  Ctrl+Z 撤销  ·  Tab 切换 2D/3D\n每艘飞船分别保存；切换前自动保存。背包无限不等于设备无限油箱。",14,UI.MUTED)
		reset_dialog=ConfirmationDialog.new();reset_dialog.theme=UI.make_theme();reset_dialog.title="恢复原始预设";reset_dialog.dialog_text="仅替换选中飞船槽位的自定义修改，其他槽位与正常航程不变。";reset_dialog.ok_button_text="恢复";reset_dialog.cancel_button_text="取消";ui.root.add_child(reset_dialog)
		reset_dialog.confirmed.connect(func():load_preset(IDS[picker.selected],true))
		ui.commands.get_child(ui.commands.get_child_count()-1).tooltip_text="创意工坊 · 预设、补给与独立存档"
	func selected_storage() -> MachineState:
		var m=game.model.machines.get(game.ship_editor.selected)
		return m if m!=null and m.kind==&"storage" else null
	func mark_source() -> void:
		var m=selected_storage()
		if m==null:game.hud.show_message("请先在建造模式中选中一个储存柜");return
		var item=StringName(supply_picker.get_item_metadata(supply_picker.selected))
		m.inventory.clear();m.storage_slots=StorageSlots.empty();sources[str(m.id)]=str(item);refill();save_current();update_info()
		game.hud.show_message("该储存柜已成为无限 "+InventoryPresentation.title(game.model.catalog,item)+" 补给源")
	func unmark_source() -> void:
		var m=selected_storage()
		if m==null:game.hud.show_message("请先选中一个储存柜");return
		sources.erase(str(m.id));save_current();update_info();game.hud.show_message("已停止自动补给，现有物资保留")
	func update_info() -> void:
		if info!=null:
			info.text="当前：%s  /  %d 甲板  ·  %d 组件  ·  %d 无限补给柜"%[NAMES[IDS.find(current)],game.model.floors.size(),game.model.machines.size(),sources.size()]
			picker.select(IDS.find(current));description.text=DESCRIPTIONS[picker.selected];source_check.set_pressed_no_signal(source_on)
	func _process(delta: float) -> void:
		supply_clock+=delta;save_clock+=delta;mineral_clock+=delta
		if mineral_clock>=1:mineral_clock=0;renew_deposits()
		if supply_clock>=.1:supply_clock=0;refill()
		if save_clock>=15:save_clock=0;save_current()
		if not game.profile.backpack is InfiniteBackpack:install_infinite_bag()
		game.save_timer=-100000
		for label in game.hud.resource_labels.values():label.text="∞"
		if game.hud.catalog_view.visible:game.hud.catalog_view.owned.text="∞ 无限库存 · 直接放置"
		if game.hud.inspector.visible and game.hud.inspector_box.get_child_count()>0:
			var titles={"iron":"铁矿总仓","oil":"燃油总仓","red":"红石总仓","ore_sorter":"采矿汇流分类仓","furnace":"基础炼钢","fast":"快速炼钢","steel":"钢材汇流仓","split":"钢材分配枢纽","bench":"弹药制造","ammo":"弹药缓存仓","lab":"科研生产","reserve":"设备建造储备","fore_fuel":"前部燃油支干","aft_fuel":"双路动力燃油支干"}
			for role in titles:
				if int(named_ids.get(role,-2))==game.ship_editor.selected:
					var line=game.hud.inspector_box.get_child(0)
					for child in line.get_children():
						if child is Label:child.text=titles[role];break
					break
		if game.hud.menu_panel.visible:
			var panel=game.hud.menu_panel;panel.size.x=660;panel.size.y=0;panel.position=Vector2((game.hud.root.size.x-panel.size.x)*.5,maxf(70,(game.hud.root.size.y-panel.size.y)*.5))
	func _notification(what: int) -> void:
		if what==NOTIFICATION_WM_CLOSE_REQUEST:save_current()

var root
func _ready() -> void:
	root=get_tree().root;call_deferred("run")
func quit(code: int=0) -> void:get_tree().quit(code)
func run() -> void:
	canonical_catalogue=restore_exported_capabilities()
	var script_dir=get_script().resource_path.get_base_dir()
	if FileAccess.file_exists(script_dir.path_join("showcase-font.ttf")):
		var font=FontFile.new();font.load_dynamic_font(script_dir.path_join("showcase-font.ttf"));font.oversampling=2.0
		UI.font=font;UI.heading_font=null;UI.number_font=null
	if OS.get_cmdline_user_args().has("--normal-voyage"):
		game=load("res://scenes/main.tscn").instantiate();root.add_child(game);return
	game=load("res://scenes/main.tscn").instantiate();game.restore_on_start=false;game.save_path="user://space-showcase-v014-bootstrap.json";game.save_timer=-1000000;root.add_child(game)
	workshop=Workshop.new();workshop.game=game;root.add_child(workshop)
	workshop.asset_dir=script_dir
	if OS.get_cmdline_user_args().has("--capture-showcase"):workshop.save_prefix="space-showcase-capture-v014-r1-"
	workshop.current="";workshop.build_menu()
	var chosen="arc"
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--ship=") and arg.trim_prefix("--ship=") in IDS:chosen=arg.trim_prefix("--ship=")
	workshop.load_preset(chosen)
	root.title="SPACE · 全产业链综合工坊 · Creative 1"
	print("SHOWCASE_READY ",chosen," decks=",game.model.floors.size()," machines=",game.model.machines.size())
	if OS.get_cmdline_user_args().has("--capture-showcase"):
		game.hud.close_overlays()
		game.camera.zoom=Vector2.ONE*.36
		for i in range(1200):await get_tree().process_frame
		await RenderingServer.frame_post_draw
		root.get_texture().get_image().save_png(script_dir.path_join("renders/"+chosen+"-3d.png"))
		game.set_mode(2);game.atelier.choose_flat(true)
		for i in range(100):await get_tree().process_frame
		game.hud.close_catalog()
		await RenderingServer.frame_post_draw
		root.get_texture().get_image().save_png(script_dir.path_join("renders/"+chosen+"-2d.png"))
		quit()
