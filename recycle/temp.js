const func = async () => {
    let i = 1;
    throw new Error('Func Error');
};

const main = () => {
    func()
        .then(() => {
            console.log('Promise returned');
            return 10;
        })
        .catch((e) => {
            console.log('Post-error tasks');
            return e;
        })
        .then((e) => {
            throw e;
            console.log('Post-Post-Error');
        });
};

main();