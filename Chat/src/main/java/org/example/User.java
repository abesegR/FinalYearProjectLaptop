

public class User implements Runnable{

    private String name;
    private ChatRoom chatRoom;

    public User(String name,ChatRoom chatRoom){
        this.name = name;
        this.chatRoom = chatRoom;
    }

    @Override
    public void run(){
        chatRoom.sendMessage(name,"Hello!");
    }

}
