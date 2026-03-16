import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { json, urlencoded } from "express";

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Enable CORS so the React frontend can talk to this API
    app.enableCors({
        origin: "*", // Explicitly allow your frontend
        methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
        credentials: true
    });

    // INCREASE THE PAYLOAD LIMIT TO 50MB
    app.use(json({ limit: "50mb" }));
    app.use(urlencoded({ extended: true, limit: "50mb" }));

    await app.listen(3000);
}
bootstrap();
