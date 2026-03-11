from fastapi_mail import ConnectionConfig, FastMail, MessageSchema
from loguru import logger

from src.core.config import settings

conf = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_USER,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_FROM=settings.MAIL_FROM,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_SERVER=settings.MAIL_HOST,
    MAIL_FROM_NAME=settings.MAIL_FROM_NAME,
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True,
)


class EmailService:
    async def send_mail(self, message: MessageSchema):
        try:
            fm = FastMail(conf)
            await fm.send_message(message)
            logger.info("Email sent successfully")
        except Exception as e:
            recipients_str = ', '.join([str(r) for r in message.recipients])
            logger.error(f"Error mail service. Cannot send email to {recipients_str}")
            logger.error(f"Exception detail: {e}")

email_service_basic = EmailService()