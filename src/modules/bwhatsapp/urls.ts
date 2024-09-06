import {Router} from "express"
import * as bwhatsappViews from "./views";

const router = Router();

router.get("/wa-sessions", bwhatsappViews.index);
router.post("/wa-sessions", bwhatsappViews.store);
//router.put("/wa-sessions/:sessionId", bwhatsappViews.store);
router.get("/wa-sessions/:sessionId", bwhatsappViews.show);
router.delete("/wa-sessions/:sessionId", bwhatsappViews.remove);
export default router;

