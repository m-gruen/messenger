import { Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ContactsResponse, ContactUtils } from '../utilities/contact-utils';
import { BaseResponse } from '../utilities/utils';
import { AuthenticatedRequest, authenticateToken } from '../middleware/auth-middleware';
import { DbSession } from '../db';

export const contactRouter = Router();

contactRouter.get('/:userId', authenticateToken, async (req: AuthenticatedRequest, res) => {
   const userId = parseInt(req.params.userId);

   if (userId !== req.user?.uid) {
      res.status(StatusCodes.FORBIDDEN).send({
         error: 'You can only access your own contacts'
      });
      return;
   }

   const dbSession = await DbSession.create(true);
   try {
      const contactUtils = new ContactUtils(dbSession);

      const response: ContactsResponse = await contactUtils.getContacts(userId);

      res.status(response.statusCode).json(
         response.data !== null ? response.data : { error: response.error }
      );
   } catch (error) {
      console.error(error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
         error: "an unexpected error occurred while processing your request"
      });
   } finally {
      await dbSession.complete();
   }
});

contactRouter.post('/:userId', authenticateToken, async (req: AuthenticatedRequest, res) => {
   const userId = parseInt(req.params.userId);
   const contactUserId = parseInt(req.body.contactUserId);

   if (userId !== req.user?.uid) {
      res.status(StatusCodes.FORBIDDEN).send({
         error: 'You can only access your own contacts'
      });
      return;
   }

   const dbSession = await DbSession.create(false);
   try {
      const contactUtils = new ContactUtils(dbSession);

      const result: BaseResponse<null> = await contactUtils.addContact(userId, contactUserId);

      await dbSession.complete(result.statusCode === StatusCodes.CREATED);
      if (result.statusCode === StatusCodes.CREATED) {
         res.sendStatus(result.statusCode);
      } else {
         res.status(result.statusCode).json({ error: result.error });
      }
   } catch (error) {
      console.error(error);
      await dbSession.complete(false);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
         error: "an unexpected error occurred while processing your request"
      });
   }
});

contactRouter.put('/:userId/:contactUserId/block', authenticateToken, async (req: AuthenticatedRequest, res) => {
   const userId = parseInt(req.params.userId);
   const contactUserId = parseInt(req.params.contactUserId);
   const { blocked } = req.body;

   if (userId !== req.user?.uid) {
      res.status(StatusCodes.FORBIDDEN).send({
         error: 'You can only access your own contacts'
      });
      return;
   }

   if (typeof blocked !== 'boolean') {
      res.status(StatusCodes.BAD_REQUEST).send({
         error: 'Blocked status must be a boolean'
      });
      return;
   }

   const dbSession = await DbSession.create(false);
   try {
      const contactUtils = new ContactUtils(dbSession);

      const result: BaseResponse<null> = await contactUtils.updateContactBlockStatus(userId, contactUserId, blocked);

      await dbSession.complete(result.statusCode === StatusCodes.OK);

      if (result.statusCode === StatusCodes.OK) {
         res.sendStatus(result.statusCode);
      } else {
         res.status(result.statusCode).json({ error: result.error });
      }
   } catch (error) {
      console.error(error);
      await dbSession.complete(false);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
         error: "an unexpected error occurred while processing your request"
      });
   }
});

contactRouter.delete('/:userId/:contactUserId', authenticateToken, async (req: AuthenticatedRequest, res) => {
   const userId = parseInt(req.params.userId);
   const contactUserId = parseInt(req.params.contactUserId);

   if (userId !== req.user?.uid) {
      res.status(StatusCodes.FORBIDDEN).send({
         error: 'You can only access your own contacts'
      });
      return;
   }

   const dbSession = await DbSession.create(false);
   try {
      const contactUtils = new ContactUtils(dbSession);

      const result: BaseResponse<null> = await contactUtils.deleteContact(userId, contactUserId);

      await dbSession.complete(result.statusCode === StatusCodes.OK);
      if (result.statusCode === StatusCodes.OK) {
         res.sendStatus(result.statusCode);
      } else {
         res.status(result.statusCode).json({ error: result.error });
      }
   } catch (error) {
      await dbSession.complete(false);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
         error: "an unexpected error occurred while processing your request"
      });
   }
});

contactRouter.get('/:userId/requests/incoming', authenticateToken, async (req: AuthenticatedRequest, res) => {
   const userId = parseInt(req.params.userId);

   if (userId !== req.user?.uid) {
      res.status(StatusCodes.FORBIDDEN).send({
         error: 'You can only access your own contact requests'
      });
      return;
   }

   const dbSession = await DbSession.create(true);
   try {
      const contactUtils = new ContactUtils(dbSession);

      const response: ContactsResponse = await contactUtils.getIncomingRequests(userId);

      res.status(response.statusCode).json(
         response.data !== null ? response.data : { error: response.error }
      );
   } catch (error) {
      console.error(error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
         error: "an unexpected error occurred while processing your request"
      });
   } finally {
      await dbSession.complete();
   }
});

contactRouter.get('/:userId/requests/outgoing', authenticateToken, async (req: AuthenticatedRequest, res) => {
   const userId = parseInt(req.params.userId);

   if (userId !== req.user?.uid) {
      res.status(StatusCodes.FORBIDDEN).send({
         error: 'You can only access your own contact requests'
      });
      return;
   }

   const dbSession = await DbSession.create(true);
   try {
      const contactUtils = new ContactUtils(dbSession);

      const response: ContactsResponse = await contactUtils.getOutgoingRequests(userId);

      res.status(response.statusCode).json(
         response.data !== null ? response.data : { error: response.error }
      );
   } catch (error) {
      console.error(error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
         error: "an unexpected error occurred while processing your request"
      });
   } finally {
      await dbSession.complete();
   }
});

contactRouter.put('/:userId/requests/:contactUserId/accept', authenticateToken, async (req: AuthenticatedRequest, res) => {
   const userId = parseInt(req.params.userId);
   const contactUserId = parseInt(req.params.contactUserId);

   if (userId !== req.user?.uid) {
      res.status(StatusCodes.FORBIDDEN).send({
         error: 'You can only manage your own contact requests'
      });
      return;
   }

   const dbSession = await DbSession.create(false);
   try {
      const contactUtils = new ContactUtils(dbSession);

      const result: BaseResponse<null> = await contactUtils.acceptContact(userId, contactUserId);

      await dbSession.complete(result.statusCode === StatusCodes.OK);

      if (result.statusCode === StatusCodes.OK) {
         res.sendStatus(result.statusCode);
      } else {
         res.status(result.statusCode).json({ error: result.error });
      }
   } catch (error) {
      console.error(error);
      await dbSession.complete(false);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
         error: "an unexpected error occurred while processing your request"
      });
   }
});

contactRouter.put('/:userId/requests/:contactUserId/reject', authenticateToken, async (req: AuthenticatedRequest, res) => {
   const userId = parseInt(req.params.userId);
   const contactUserId = parseInt(req.params.contactUserId);

   if (userId !== req.user?.uid) {
      res.status(StatusCodes.FORBIDDEN).send({
         error: 'You can only manage your own contact requests'
      });
      return;
   }

   const dbSession = await DbSession.create(false);
   try {
      const contactUtils = new ContactUtils(dbSession);

      const result: BaseResponse<null> = await contactUtils.rejectContact(userId, contactUserId);

      await dbSession.complete(result.statusCode === StatusCodes.OK);

      if (result.statusCode === StatusCodes.OK) {
         res.sendStatus(result.statusCode);
      } else {
         res.status(result.statusCode).json({ error: result.error });
      }
   } catch (error) {
      console.error(error);
      await dbSession.complete(false);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
         error: "an unexpected error occurred while processing your request"
      });
   }
});
