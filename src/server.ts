import app from './app';
import * as Sentry from "@sentry/node";

Sentry.setupExpressErrorHandler(app);
// app.use((err: any, res: any) => {
//   res.statusCode = 500;
//   res.end("Internal Server Error");
// });

app.use((err: any, req: any, res: any, next: any) => {
    console.error(err); 
    res.status(500).json({ error: "Internal Server Error" });
});
app.listen(process.env.PORT || 3010, () => console.log("Server running on port 3010"));
