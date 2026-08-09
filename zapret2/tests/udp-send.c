#include <arpa/inet.h>
#include <errno.h>
#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <unistd.h>

int main(int argc, char **argv)
{
	unsigned char packet[2048];
	struct sockaddr_in target = { .sin_family = AF_INET };
	ssize_t length;
	int file, socket_fd;

	if (argc != 4 || inet_pton(AF_INET, argv[1], &target.sin_addr) != 1)
		return 2;
	target.sin_port = htons((unsigned short)strtoul(argv[2], NULL, 10));
	file = open(argv[3], O_RDONLY);
	if (file < 0)
		return 2;
	length = read(file, packet, sizeof(packet));
	close(file);
	if (length <= 0)
		return 2;
	socket_fd = socket(AF_INET, SOCK_DGRAM, 0);
	if (socket_fd < 0)
		return 1;
	if (sendto(socket_fd, packet, (size_t)length, 0,
		   (const struct sockaddr *)&target, sizeof(target)) != length) {
		fprintf(stderr, "sendto: %s\n", strerror(errno));
		close(socket_fd);
		return 1;
	}
	close(socket_fd);
	return 0;
}
