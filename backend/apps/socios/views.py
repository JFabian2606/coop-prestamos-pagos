from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Socio
from .serializers import SocioSerializer, ProfileCreateSerializer


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        socio = getattr(request.user, 'socio', None)
        if not socio:
            return Response({'detail': 'Perfil de socio no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(SocioSerializer(socio).data)


class ProfileUpsertView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ProfileCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        socio = serializer.save()
        return Response(SocioSerializer(socio).data, status=status.HTTP_201_CREATED)

