import html, math
KINDS={'usecase','activity','class','package','sequence','state','dfd','deployment'}
NODE_TYPES={'actor','usecase','system','action','decision','initial','final','class','package','state','process','external','store','deployment','lifeline'}
EDGE_STYLES={'flow','association','dependency','return','include','extend'}

def validate(m):
    if not isinstance(m,dict) or m.get('kind') not in KINDS: raise ValueError('Unknown model kind')
    nodes=m.get('nodes'); edges=m.get('edges',[])
    if not isinstance(nodes,list) or not 1<=len(nodes)<=40 or not isinstance(edges,list) or len(edges)>80: raise ValueError('Invalid node/edge count')
    ids=set()
    for n in nodes:
        if not isinstance(n,dict): raise ValueError('Invalid node')
        nid=n.get('id'); typ=n.get('type'); lab=n.get('label','')
        if not isinstance(nid,str) or not nid or nid in ids: raise ValueError('Duplicate/invalid node id')
        ids.add(nid)
        if typ not in NODE_TYPES: raise ValueError('Unsupported node type')
        if not isinstance(lab,str) or len(lab)>500: raise ValueError('Invalid label')
        for k in ('x','y'):
            v=n.get(k,0)
            if isinstance(v,bool) or not isinstance(v,(int,float)) or not math.isfinite(v) or not -100<=v<=2500: raise ValueError('Invalid coordinate')
    for e in edges:
        if e.get('from') not in ids or e.get('to') not in ids: raise ValueError('Edge references missing node')
        if e.get('style','flow') not in EDGE_STYLES: raise ValueError('Invalid edge style')
        if len(str(e.get('label','')))>180: raise ValueError('Edge label too long')
    return True

def _dims(n):
    typ=n['type']; lines=str(n.get('label','')).split('\n')
    if typ=='system': return float(n.get('width',700)), float(n.get('height',500))
    if typ in ('initial','final'): return 40,40
    if typ=='decision': return 100,80
    if typ=='actor': return 120,140
    if typ=='lifeline': return 180,420
    h=max(85, 28*len(lines)+35)
    return 240,h

def _center(n):
    w,h=_dims(n); return n.get('x',0)+w/2,n.get('y',0)+h/2

def render(m):
    validate(m); nodes=m['nodes']; edges=m.get('edges',[]); kind=m['kind']
    by={n['id']:n for n in nodes}
    maxx=max(n.get('x',0)+_dims(n)[0] for n in nodes)+120; maxy=max(n.get('y',0)+_dims(n)[1] for n in nodes)+120
    out=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{max(900,maxx)}" height="{max(650,maxy)}" viewBox="0 0 {max(900,maxx)} {max(650,maxy)}">',
         '<defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#263247"/></marker></defs>',
         '<style>text{font-family:Arial,sans-serif;fill:#17233a;font-size:16px}.small{font-size:13px}.box{fill:#fff;stroke:#263247;stroke-width:2}.soft{fill:#eef5fb;stroke:#1779ba;stroke-width:2}</style>']
    # system boundaries first
    for n in nodes:
        if n['type']=='system':
            w,h=_dims(n); x,y=n['x'],n['y']; out.append(f'<rect class="box" x="{x}" y="{y}" width="{w}" height="{h}" rx="4"/>'); out.append(f'<text x="{x+12}" y="{y+24}" font-weight="bold">{html.escape(n.get("label","System"))}</text>')
    # edges
    for i,e in enumerate(edges):
        a,b=by[e['from']],by[e['to']]; x1,y1=_center(a); x2,y2=_center(b); style=e.get('style','flow'); dash=' stroke-dasharray="7 6"' if style in ('dependency','return','include','extend') else ''
        marker='' if style=='association' else ' marker-end="url(#arrow)"'
        out.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#263247" stroke-width="2"{dash}{marker}/>')
        lab=str(e.get('label',''))
        if style=='include': lab=('«include» '+lab).strip()
        if style=='extend': lab=('«extend» '+lab).strip()
        if lab:
            mx=(x1+x2)/2; my=(y1+y2)/2-6; out.append(f'<text class="small" x="{mx}" y="{my}" text-anchor="middle">{html.escape(lab)}</text>')
    # nodes
    for n in nodes:
        typ=n['type']; x,y=n['x'],n['y']; lab=str(n.get('label','')); w,h=_dims(n)
        if typ=='system': continue
        if typ=='actor':
            cx=x+w/2; out += [f'<circle class="box" cx="{cx}" cy="{y+28}" r="18"/>',f'<line x1="{cx}" y1="{y+46}" x2="{cx}" y2="{y+90}" stroke="#263247" stroke-width="2"/>',f'<line x1="{cx-28}" y1="{y+62}" x2="{cx+28}" y2="{y+62}" stroke="#263247" stroke-width="2"/>',f'<line x1="{cx}" y1="{y+90}" x2="{cx-25}" y2="{y+120}" stroke="#263247" stroke-width="2"/>',f'<line x1="{cx}" y1="{y+90}" x2="{cx+25}" y2="{y+120}" stroke="#263247" stroke-width="2"/>',f'<text x="{cx}" y="{y+140}" text-anchor="middle">{html.escape(lab)}</text>']
        elif typ=='usecase':
            out.append(f'<ellipse class="soft" cx="{x+w/2}" cy="{y+h/2}" rx="{w/2}" ry="{h/2}"/>'); out.append(f'<text x="{x+w/2}" y="{y+h/2+5}" text-anchor="middle">{html.escape(lab)}</text>')
        elif typ=='decision':
            cx,cy=x+w/2,y+h/2; out.append(f'<polygon class="soft" points="{cx},{y} {x+w},{cy} {cx},{y+h} {x},{cy}"/>'); out.append(f'<text class="small" x="{cx}" y="{cy+5}" text-anchor="middle">{html.escape(lab)}</text>')
        elif typ=='initial': out.append(f'<circle cx="{x+20}" cy="{y+20}" r="14" fill="#263247"/>')
        elif typ=='final': out += [f'<circle cx="{x+20}" cy="{y+20}" r="16" fill="none" stroke="#263247" stroke-width="3"/>',f'<circle cx="{x+20}" cy="{y+20}" r="9" fill="#263247"/>']
        elif typ=='lifeline':
            out.append(f'<rect class="box" x="{x}" y="{y}" width="{w}" height="55"/>'); out.append(f'<text x="{x+w/2}" y="{y+34}" text-anchor="middle">{html.escape(lab)}</text>'); out.append(f'<line x1="{x+w/2}" y1="{y+55}" x2="{x+w/2}" y2="{y+h}" stroke="#69758a" stroke-dasharray="6 6"/>')
        elif typ=='class':
            out.append(f'<rect class="box" x="{x}" y="{y}" width="{w}" height="{h}"/>'); lines=lab.split('\n');
            if lines:
                out.append(f'<text x="{x+w/2}" y="{y+24}" text-anchor="middle" font-weight="bold">{html.escape(lines[0])}</text>')
                yy=y+48
                for line in lines[1:]: out.append(f'<text class="small" x="{x+10}" y="{yy}">{html.escape(line)}</text>'); yy+=22
        elif typ=='store':
            out += [f'<line x1="{x}" y1="{y}" x2="{x+w}" y2="{y}" stroke="#263247" stroke-width="2"/>',f'<line x1="{x}" y1="{y+h}" x2="{x+w}" y2="{y+h}" stroke="#263247" stroke-width="2"/>',f'<text x="{x+w/2}" y="{y+h/2+5}" text-anchor="middle">{html.escape(lab)}</text>']
        else:
            out.append(f'<rect class="soft" x="{x}" y="{y}" width="{w}" height="{h}" rx="{10 if typ in ("action","state","process") else 2}"/>')
            lines=lab.split('\n'); yy=y+h/2-(len(lines)-1)*10
            for line in lines: out.append(f'<text x="{x+w/2}" y="{yy}" text-anchor="middle">{html.escape(line)}</text>'); yy+=22
    out.append('</svg>'); return ''.join(out)

STARTERS={
'usecase':{'kind':'usecase','nodes':[{'id':'sys','type':'system','label':'System boundary','x':220,'y':40,'width':800,'height':520},{'id':'a1','type':'actor','label':'Actor A','x':20,'y':130},{'id':'u1','type':'usecase','label':'Goal A','x':430,'y':160},{'id':'u2','type':'usecase','label':'Goal B','x':430,'y':320}], 'edges':[{'from':'a1','to':'u1','style':'association'}]},
'activity':{'kind':'activity','nodes':[{'id':'s','type':'initial','label':'','x':70,'y':90},{'id':'a','type':'action','label':'Action A','x':180,'y':70},{'id':'d','type':'decision','label':'condition?','x':500,'y':75},{'id':'ok','type':'action','label':'Outcome A','x':700,'y':30},{'id':'bad','type':'action','label':'Outcome B','x':700,'y':170}], 'edges':[{'from':'s','to':'a'},{'from':'a','to':'d'},{'from':'d','to':'ok','label':'[condition true]'},{'from':'d','to':'bad','label':'[otherwise]'}]},
'class':{'kind':'class','nodes':[{'id':'a','type':'class','label':'ConceptA\n-id: str\n+operation()','x':100,'y':100},{'id':'b','type':'class','label':'ConceptB\n-value: str','x':500,'y':100}], 'edges':[{'from':'a','to':'b','style':'association','label':'1     0..*'}]},
'package':{'kind':'package','nodes':[{'id':'p1','type':'package','label':'Package A','x':80,'y':80},{'id':'p2','type':'package','label':'Package B','x':400,'y':80},{'id':'p3','type':'package','label':'Package C','x':720,'y':80}], 'edges':[{'from':'p1','to':'p2','style':'dependency'},{'from':'p2','to':'p3','style':'dependency'}]},
'sequence':{'kind':'sequence','nodes':[{'id':'a','type':'lifeline','label':'Participant A','x':40,'y':30},{'id':'b','type':'lifeline','label':'Participant B','x':320,'y':30},{'id':'c','type':'lifeline','label':'Participant C','x':600,'y':30}], 'edges':[{'from':'a','to':'b','label':'messageA()'},{'from':'b','to':'c','label':'messageB()'}]},
'state':{'kind':'state','nodes':[{'id':'a','type':'state','label':'STATE_A','x':80,'y':100},{'id':'b','type':'state','label':'STATE_B','x':420,'y':100},{'id':'c','type':'state','label':'STATE_C','x':760,'y':100}], 'edges':[{'from':'a','to':'b','label':'eventA'},{'from':'b','to':'c','label':'eventB'}]},
'dfd':{'kind':'dfd','nodes':[{'id':'e','type':'external','label':'External entity','x':50,'y':100},{'id':'p','type':'process','label':'Process A','x':400,'y':100},{'id':'s','type':'store','label':'Data store','x':760,'y':100}], 'edges':[{'from':'e','to':'p','label':'input data'},{'from':'p','to':'s','label':'stored data'}]},
'deployment':{'kind':'deployment','nodes':[{'id':'n1','type':'deployment','label':'Client node','x':70,'y':100},{'id':'n2','type':'deployment','label':'Application node','x':390,'y':100},{'id':'n3','type':'deployment','label':'Data node','x':710,'y':100}], 'edges':[{'from':'n1','to':'n2','label':'protocol'},{'from':'n2','to':'n3','label':'protocol'}]}
}
