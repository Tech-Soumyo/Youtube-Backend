import {asyncHandler} from "../utils/asyncHandlers.js"

const registerUser = asyncHandler( async (req, res) =>{
     res.status(200).json({
        massage: "Starting Your Backend Project !!"
    })
})

export {registerUser}
 