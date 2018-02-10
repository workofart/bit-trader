create table bitfinex_price_candle (
id bigserial primary key,
ticker varchar(20) not null,
open float not null,
close float not null,
low float not null,
high float not null,
volume float not null,
timestamp timestamp not null,
unique(ticker, timestamp) );



create table bitfinex_price_ticker (
id bigserial primary key,
ticker varchar(20) not null,
bid float not null,
bid_size float not null,
ask float not null,
ask_size float not null,
daily_change float not null,
daily_change_perc float not null,
last_price float not null,
high float not null,
low float not null,
volume float not null,
timestamp timestamp not null,
unique(ticker, timestamp)
);


create table bitfinex_books (
id bigserial primary key,
ticker varchar(20) not null,
price float not null,
count int not null,
amount float not null,
timestamp timestamp not null,
unique(ticker, timestamp, price)
);


create table bitfinex_transactions (
    id bigserial primary key,
    ticker varchar(20) not null,
    price float not null,
    qty float not null,
    side boolean not null,
    timestamp timestamp not null
);


create table bitfinex_live_price (
    id bigserial primary key,
    ticker varchar(20) not null,
    price float not null,
    bid float not null,
    bid_size float not null,
    ask float not null,
    ask_size float not null,
    high float not null,
    low float not null,
    volume float not null,
    timestamp timestamp not null,
    rsi float not null,
    bb_lower float not null,
    bb_upper float not null
);

create table bitfinex_live_wallet (
    id bigserial primary key,
    balance float not null,
    timestamp timestamp not null
);

create table binance_wallet (
    id bigserial primary key,
    balance float not null,
    timestamp timestamp not null
);


create table binance_transactions (
    id bigserial primary key,
    ticker varchar(20) not null,
    price float not null,
    qty float not null,
    side boolean not null,
    timestamp timestamp not null
);


create table binance_live_price (
    id bigserial primary key,
    ticker varchar(20) not null,
    price float not null,
    high float not null,
    low float not null,
    volume float not null,
    timestamp timestamp not null,
    rsi float not null,
    bb_lower float not null,
    bb_upper float not null
);


COPY bitfinex_live_price TO '/live_price_sideway_long.csv' DELIMITER ',' CSV HEADER;
COPY binance_live_price TO '/temp/binance.csv' DELIMITER ',' CSV HEADER;