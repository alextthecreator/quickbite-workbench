import math

def _num(v, lo=0, hi=1e9):
    if isinstance(v, bool) or not isinstance(v,(int,float)) or not math.isfinite(float(v)):
        raise ValueError('Expected finite number')
    v=float(v)
    if v < lo or v > hi: raise ValueError('Number out of range')
    return v

def feasibility(c):
    build=_num(c.get('build_cost',30000)); benefit=_num(c.get('monthly_benefit',5200)); cost=_num(c.get('monthly_cost',1800)); months=int(_num(c.get('months',12),1,120))
    net=benefit-cost; value=months*net-build; payback=(build/net if net>0 else None)
    return {'monthly_net':round(net,2),'net_value':round(value,2),'payback_months':None if payback is None else round(payback,2),'assumptions':['undiscounted cash flow','synthetic PLN','no tax/inflation/financing']}

def availability(c):
    mtbf=_num(c.get('mtbf_hours',240),0.001); mttr=_num(c.get('mttr_hours',2),0.001); db=_num(c.get('database_availability',0.999),0,1); reps=int(_num(c.get('app_replicas',1),1,5))
    a=mtbf/(mtbf+mttr); aapp=1-(1-a)**reps; sys=aapp*db; downtime=(1-sys)*43200
    return {'single_app_availability':round(a,8),'app_tier_availability':round(aapp,8),'system_availability':round(sys,8),'system_percent':round(sys*100,6),'monthly_downtime_minutes':round(downtime,3),'assumptions':['independent app failures','perfect failover','30-day month','required database in series']}

def capacity(c):
    peak=_num(c.get('peak_rps',150)); per=_num(c.get('rps_per_node',90),0.001); target=_num(c.get('target_utilization',0.6),0.1,0.95); node_cost=_num(c.get('node_monthly_cost',220)); db_cost=_num(c.get('database_monthly_cost',350)); reserve=int(_num(c.get('reserve_nodes',1),0,5))
    working=math.ceil(peak/(per*target)); total=working+reserve; util=peak/(total*per)
    return {'working_nodes':working,'reserve_nodes':reserve,'total_nodes':total,'monthly_cost':round(total*node_cost+db_cost,2),'normal_utilization':round(util,4),'post_one_node_failure_utilization':None if total<=1 else round(peak/((total-1)*per),4),'limitation':'Arithmetic capacity estimate; does not predict latency.'}

def sprint(c):
    cap=int(_num(c.get('capacity_points',13),1,100)); items=c.get('items',[])
    if not isinstance(items,list) or len(items)>200: raise ValueError('Invalid items')
    selected=[]; used=0; pending=[]
    ids=set()
    for item in items:
        if not isinstance(item,dict): raise ValueError('Invalid item')
        iid=item.get('id'); pts=item.get('points'); deps=item.get('depends',[])
        if not isinstance(iid,str) or not iid.strip() or iid in ids: raise ValueError('Invalid/duplicate id')
        ids.add(iid)
        if isinstance(pts,bool) or not isinstance(pts,int) or not 1<=pts<=100: raise ValueError('Invalid points')
        if not isinstance(deps,list): raise ValueError('Invalid dependencies')
        pending.append((iid,pts,deps))
    changed=True
    while changed:
        changed=False
        rest=[]
        for iid,pts,deps in pending:
            if all(d in selected for d in deps) and used+pts<=cap:
                selected.append(iid); used+=pts; changed=True
            else: rest.append((iid,pts,deps))
        pending=rest
    return {'selected':selected,'used_points':used,'unused_points':cap-used,'unselected':[x[0] for x in pending],'limitation':'Greedy priority-order teaching heuristic; not an optimizer.'}

ALLOWED={
'CART': {'place':'PLACED'},
'PLACED': {'confirm':'CONFIRMED','reject':'REJECTED','cancel':'CANCELLED'},
'CONFIRMED': {'start_preparing':'PREPARING','cancel':'CANCELLED'},
'PREPARING': {'mark_ready':'READY'},
'READY': {'pickup':'OUT_FOR_DELIVERY'},
'OUT_FOR_DELIVERY': {'deliver':'DELIVERED'},
'DELIVERED': {}, 'CANCELLED': {}, 'REJECTED': {}
}
def order_state(c):
    state=str(c.get('initial','PLACED')).upper(); events=c.get('events',['confirm','start_preparing','mark_ready','pickup','deliver'])
    if state not in ALLOWED or not isinstance(events,list) or len(events)>100: raise ValueError('Invalid state/events')
    trace=[]
    for ev in events:
        ev=str(ev)
        nxt=ALLOWED[state].get(ev); ok=nxt is not None
        trace.append({'from':state,'event':ev,'to':nxt if ok else state,'accepted':ok})
        if ok: state=nxt
    return {'final_state':state,'trace':trace,'limitation':'Checks lifecycle transitions only; not authorization, payment consistency, concurrency or inventory.'}

DEFAULTS={
'feasibility':{'build_cost':30000,'monthly_benefit':5200,'monthly_cost':1800,'months':12},
'availability':{'mtbf_hours':240,'mttr_hours':2,'database_availability':0.999,'app_replicas':1},
'capacity':{'peak_rps':150,'rps_per_node':90,'target_utilization':0.6,'node_monthly_cost':220,'database_monthly_cost':350,'reserve_nodes':1},
'sprint':{'capacity_points':13,'items':[{'id':'AUTH','points':3,'depends':[]},{'id':'ORDER','points':5,'depends':['AUTH']},{'id':'AUDIT','points':3,'depends':['AUTH']},{'id':'NOTIFY','points':2,'depends':['ORDER']},{'id':'COURIER','points':5,'depends':['ORDER']}]},
'order_state':{'initial':'PLACED','events':['confirm','start_preparing','mark_ready','pickup','deliver']}
}
ENGINES={'feasibility':feasibility,'availability':availability,'capacity':capacity,'sprint':sprint,'order_state':order_state}
