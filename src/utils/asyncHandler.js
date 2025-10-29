const asyncHandler = (reqHandler) => {
    return (req, res, next) => {
        reqHandler(req, res, next).catch(next);
    };
};

export { asyncHandler };