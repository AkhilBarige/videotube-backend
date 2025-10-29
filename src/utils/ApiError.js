// class ApiError extends Error {
//     constructor(statuscode, errors = [], message = "something went wrong", stack) {
//         super(message);
//         this.name = this.constructor.name;
//         this.statuscode = statuscode;
//         this.errors = errors;
//         this.data = null;

//         if (stack) {
//             this.stack = stack;
//         } else {
//             Error.captureStackTrace(this, this.constructor);
//         }
//     }

//     toJSON() {
//         return {
//             statuscode: this.statuscode,
//             message: this.message,
//             errors: this.errors,
//             data: this.data
//         };
//     }
// }

// export { ApiError };

class ApiError extends Error {
    constructor(
        statusCode,
        message = "Something went wrong",
        errors = [],
        stack = ""
    ) {
        super(message)
        this.statusCode = statusCode
        this.data = null
        this.message = message
        this.success = false;
        this.errors = errors

        if (stack) {
            this.stack = stack
        } else {
            Error.captureStackTrace(this, this.constructor)
        }

    }
}

export { ApiError }