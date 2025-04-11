import express, { Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ContactUtils, ContactsResponse } from '../utilities/contact-utils';
import { DbSession } from '../db';
import { MessageResponse, MessageUtils } from '../utilities/message-utils';

export const msgRouter = Router();

msgRouter.get('/', async (req, res) => {
   const sender_uid: number = parseInt(req.query.sender_uid as string);
   const receiver_uid: number = parseInt(req.query.receiver_uid as string);


   let dbSession = await DbSession.create(true);
   try {
      const msgUtils = new MessageUtils(dbSession);

      const response: MessageResponse = await msgUtils.fetchMessage(sender_uid, receiver_uid);

      res.status(response.statusCode).json(
         response.data !== null ? response.data : { error: response.error }
      );

   } catch (error) {
      console.error(error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
         error: 'Internal server error occurred while fetching contacts'
      });
   } finally {
      await dbSession.complete();
   }
});

msgRouter.post('/', async (req, res) => {
   const { sender_uid, receiver_uid, content } = req.body;
   let dbSession = await DbSession.create(true);

   try {
   
      const msgUtils = new MessageUtils(dbSession);

      const response: MessageResponse = await msgUtils.sendMessage(sender_uid, receiver_uid, content);

      res.status(response.statusCode).json(
         response.data !== null ? response.data : { error: response.error }
      );

   } catch (error) {
      await dbSession.complete(false);
      console.error(error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
         error: 'Internal server error occurred while sending message'
      });
   } finally {
      await dbSession.complete(true);
   }


});


