

public class Main {
    public static void main(String[] args) {

        System.out.println("Hello");
        ChatRoom chatRoom = new ChatRoom();

        Thread user1 = new Thread(new User("Alice",chatRoom));
        Thread user2 = new Thread(new User("Bob",chatRoom));

        user1.start();
        user2.start();
    }
}