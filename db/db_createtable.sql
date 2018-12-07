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

-- The two commands below are used to manually export existing data from DB to csv files
COPY bitfinex_live_price TO '/live_price_sideway_long.csv' DELIMITER ',' CSV HEADER;
COPY binance_live_price TO '/temp/binance.csv' DELIMITER ',' CSV HEADER;