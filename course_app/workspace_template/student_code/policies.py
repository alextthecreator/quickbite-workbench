"""QuickBite policy functions used in M10.
Three functions contain intentional defects. Do not change public names/signatures.
"""

def can_cancel_order(status):
    """Return True only for PLACED or CONFIRMED. status must be a known uppercase state string."""
    known={'CART','PLACED','CONFIRMED','PREPARING','READY','OUT_FOR_DELIVERY','DELIVERED','CANCELLED','REJECTED'}
    if not isinstance(status,str) or status not in known:
        raise ValueError('Unknown order status')
    return status in {'PLACED','CONFIRMED','PREPARING'}


def delivery_fee(distance_km, subtotal):
    """If subtotal >= 80 PLN fee is 0. Otherwise 5 PLN + 1.50 PLN/km. Validate finite nonnegative numbers, exclude bool."""
    import math
    for v in (distance_km, subtotal):
        if isinstance(v,bool) or not isinstance(v,(int,float)) or not math.isfinite(float(v)) or v < 0:
            raise ValueError('Expected finite nonnegative number')
    if subtotal > 80:
        return 0.0
    return round(5 + 1.5*distance_km, 2)


def next_order_state(current, event):
    """Return next state for a legal transition; illegal transitions raise ValueError."""
    allowed={
        'CART':{'place':'PLACED'},
        'PLACED':{'confirm':'CONFIRMED','reject':'REJECTED','cancel':'CANCELLED'},
        'CONFIRMED':{'start_preparing':'PREPARING','cancel':'CANCELLED'},
        'PREPARING':{'mark_ready':'READY'},
        'READY':{'pickup':'DELIVERED'},
        'OUT_FOR_DELIVERY':{'deliver':'DELIVERED'},
        'DELIVERED':{},'CANCELLED':{},'REJECTED':{}
    }
    if current not in allowed or not isinstance(event,str): raise ValueError('Invalid state/event')
    if event not in allowed[current]: raise ValueError('Illegal transition')
    return allowed[current][event]


def calculate_order_total(item_prices, fee):
    """Return rounded sum(item_prices)+fee. Values must be finite nonnegative numbers, excluding bool."""
    import math
    if not isinstance(item_prices,list): raise ValueError('item_prices must be list')
    vals=[]
    for v in item_prices+[fee]:
        if isinstance(v,bool) or not isinstance(v,(int,float)) or not math.isfinite(float(v)) or v<0: raise ValueError('Invalid money value')
        vals.append(float(v))
    return round(sum(vals[:-1])+vals[-1],2)


def normalize_payment_status(provider_status):
    """Adapter: map PAID/DECLINED/PENDING (case-insensitive) to approved/rejected/pending."""
    if not isinstance(provider_status,str) or not provider_status.strip(): raise ValueError('Invalid payment status')
    m={'PAID':'approved','DECLINED':'rejected','PENDING':'pending'}
    key=provider_status.strip().upper()
    if key not in m: raise ValueError('Unknown payment status')
    return m[key]


def notification(channel, order_id):
    """Factory-like teaching function returning a notification payload for email/sms/push."""
    if channel not in {'email','sms','push'} or not isinstance(order_id,str) or not order_id.strip(): raise ValueError('Invalid notification input')
    return {'channel':channel,'order_id':order_id,'message':f'Order {order_id} updated'}
