const asyncHandlers = (requestHandlers)=>{
    (req, res, next) =>{
        Promise.resolve(requestHandlers(req, res, next)).catch((err)=> next(err))
    }
}

export {asyncHandlers}

// const asyncHandlers = (fn)=> async(req, res, next)=>{
//     try {
//         await fn(req, res, next)
//     } catch (error) {
//         res.status (err.code || 500).json({
//             success: false,
//             message: err.message
//         })
//     }

// }